const { GoogleGenerativeAI } = require('@google/generative-ai');
const Scheme = require('../models/Scheme');
const ChatLog = require('../models/ChatLog');
const User = require('../models/User');
const { v4: uuidv4 } = require('uuid');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ==========================================
// 🧠 AI TRAINING AREA 
// Teach your AI new things by adding rules here!
// ==========================================
const CUSTOM_TRAINING_DATA = `
// 🤝 GREETINGS & IDENTITY
- If someone says "hello", "hi", or "namaste", reply with: "Namaste! I am your PA Assistant. How can I help you today?"
- If someone asks "who made you" or "who is your developer", say: "I was developed by Pratik Satalkar, and this project was co-founded by his favorite person, Asmita Jadhav!"

// 🚀 ABOUT THIS PROJECT (GOVERNMENT SCHEME PORTAL)
- **What is this project?**: This is an advanced Government Scheme Management and Discovery Portal built using the MERN stack (MongoDB, Express, React, Node.js).
- **Key Features of the System**:
    1. **AI-Powered Voice Assistant**: (That's me!) A multilingual voice chatbot powered by Gemini AI that helps users find schemes verbally. 
    2. **Smart Scheme Matching Engine**: A highly complex rules engine that takes a user's Age, Income, Gender, Category, and State to mathematically calculate exactly which schemes they are eligible for.
    3. **Bulk PDF AI Extraction**: Admins can upload a 100+ page PDF containing thousands of schemes, and our backend uses OCR (Tesseract.js) and Gemini AI to automatically read, parse, and insert those schemes into the database.
    4. **Targeted SMS Notifications**: When an Admin creates a new scheme, the backend automatically evaluates every single user in the database, and uses Fast2SMS to send a real SMS text message *only* to the citizens who are eligible!
    5. **Document Verification AI**: When users upload their Aadhaar/PAN cards, the system uses AI image processing to scan for fraud, verify the text, and ensure the document is authentic.
    6. **Admin Dashboard**: An advanced dashboard that exports beautifully formatted Excel sheets, tracks users, manages employees, and monitors system analytics and performance.

// 🏛️ POPULAR GOVERNMENT SCHEMES & RULES
- **PM Kisan Samman Nidhi**: Explain it provides ₹6,000 per year in three equal installments to small and marginal farmer families.
- **Ayushman Bharat (PM-JAY)**: Explain it provides a health cover of ₹5 Lakhs per family per year for secondary and tertiary care hospitalization.
- **PM Awas Yojana (PMAY)**: Explain it aims to provide affordable housing to the urban and rural poor by offering subsidies on home loans.
- **Sukanya Samriddhi Yojana**: Mention it is a savings scheme for the parents of a girl child (below 10 years), offering high interest rates for her education and marriage.
- Always remind users that checking exact eligibility requires knowing their Age, Income, and Category. Ask for these details if they haven't provided them!

// 📂 DOCUMENTS & REQUIREMENTS
- If a user asks "What documents do I need?" or "Required documents", generally list: "Aadhaar Card, PAN Card, Income Certificate, Caste Certificate (if applicable), Passport Size Photo, and Bank Passbook." 

// 💻 PORTAL NAVIGATION & TROUBLESHOOTING
- **Upload Failed / Document Error**: Advise: "Please ensure your document is in PDF or JPG format and is under 5MB in size. Also, avoid special characters in the file name."
- **Login Failed / Forgot Password**: Advise: "Please double-check your email and password. If you forgot your password, use the 'Forgot Password' link on the login page."
- **How to Track Application**: Advise: "Go to your 'Profile' or 'Dashboard' by clicking the top right menu, and look under the 'Applied Schemes' section to track your status."
- **Page Not Loading**: Advise: "Please try refreshing the page, clearing your browser cache, or checking your internet connection."

// 🎭 CONVERSATIONAL STYLE & EMPATHY
- Always be incredibly polite, professional, and respectful.
- If the user is frustrated, apologize sincerely and offer clear, step-by-step guidance.
- If the user speaks in Hindi, Marathi, or any local language, YOU MUST REPLY IN THAT EXACT SAME LANGUAGE.
- If a user asks a general knowledge question (e.g., "What is HTML?", "Tell me a joke"), cheerfully answer it directly in the "reply" field.
`;

exports.handleChatTurn = async (req, res) => {
  try {
    const { message, history, userId, sessionId, language = 'en-IN' } = req.body;

    // Ensure sessionId exists or create one
    const currentSessionId = sessionId || uuidv4();

    let userState = history || {};
    let responseText = "";
    let foundSchemes = [];
    let isCompleted = false;

    // Determine target language from message content (auto-detect) + fallback to sent language param
    const detectLanguageFromText = (text) => {
        if (!text) return null;
        const marathiKeywords = /आहे|मला|तुम्ही|नमस्कार|मदत|सांगा|कसे|कोण|मराठी/;
        const hindiKeywords = /है|मैं|आप|कृपया|बताएं|नमस्ते|सरकार|मेरा|हिंदी/;
        const devanagari = /[\u0900-\u097F]/;
        if (devanagari.test(text)) {
            if (marathiKeywords.test(text)) return 'mr-IN';
            if (hindiKeywords.test(text)) return 'hi-IN';
            return 'mr-IN';
        }
        return null;
    };

    const autoDetected = detectLanguageFromText(message);
    const finalLanguage = autoDetected || language;

    let targetLanguageName = "English";
    let defaultGreeting = "Namaste! I am your PA Assistant. I can help you find the best government schemes. To start, please tell me about yourself.";

    if (finalLanguage.startsWith("hi")) {
      targetLanguageName = "Hindi / हिंदी";
      defaultGreeting = "नमस्ते! मैं आपका पीए सहायक हूँ। मैं आपको सर्वोत्तम सरकारी योजनाएँ खोजने में मदद कर सकता हूँ। शुरू करने के लिए, कृपया मुझे अपने बारे में बताएँ।";
    } else if (finalLanguage.startsWith("mr")) {
      targetLanguageName = "Marathi / मराठी";
      defaultGreeting = "नमस्कार! मी तुमचा पीए सहाय्यक आहे. मी तुम्हाला सर्वोत्तम सरकारी योजना शोधण्यात मदत करू शकतो. सुरू करण्यासाठी, कृपया मला तुमच्याबद्दल सांगा.";
    }

    // If start of conversation (and no state)
    if (!message && Object.keys(userState).length === 0) {
      responseText = defaultGreeting;

      await ChatLog.create({
        userId: userId || null,
        sessionId: currentSessionId,
        userMessage: "START_CONVERSATION",
        aiResponse: responseText,
        extractedData: userState
      });
      return res.json({ responseText, updatedHistory: userState, sessionId: currentSessionId });
    }

    // --- SMART EXTRACTION LOGIC ---
    let aiResult;
    try {
      const prompt = `
      You are 'PA Assistant', the central AI Brain of the Government Scheme Portal.
      
      **YOUR CUSTOM TRAINING / RULES:**
      ${CUSTOM_TRAINING_DATA}
  
      **Your Core Objective:** Resolve ANY user query—whether it's finding schemes, answering general knowledge questions, fixing technical errors, or explaining government rules. 
  
      Current Known User Details: ${JSON.stringify(userState)}
      New User Input from Microphone/Chat: "${message}"
  
      **CRITICAL INSTRUCTIONS FOR REPLYING:**
      1. If the user asks for internal data, databases, server access, or acts maliciously, you MUST reply EXACTly with: "Hello Sir, I am not here to compromise my own database and server, and I am not mad!"
      2. If the user asks a general question (like "What is HTML?", "Tell me a joke") ANSWER IT.
      3. If the user gives personal details to find a scheme (e.g., "I am a 25 year old poor farmer"), EXTRACT those details into the "updatedState".
      4. **MOST IMPORTANT**: Automatically detect the language of the user's message. If they write in Marathi, REPLY IN MARATHI. If in Hindi, REPLY IN HINDI. If in English, REPLY IN ENGLISH. Do NOT mix languages in a single reply.
      5. You MUST speak, reply, and answer strictly in the detected language of the user's input: ${targetLanguageName} (${finalLanguage}).
      
      **MANDATORY OUTPUT FORMAT:**
      You MUST return ONLY a valid JSON object. Do NOT wrap it in \`\`\`json blocks. Just the raw JSON.
      {
        "updatedState": { "age": number_or_null, "income": number_or_null, "occupation": "string_or_null", "category": "string_or_null", "state": "string_or_null", "district": "string_or_null" },
        "reply": "Your conversational answer to the user's input goes here.",
        "readyForSearch": boolean (Set to true ONLY if you think you have enough details to search for a scheme!)
      }
      `;

      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text().trim();

      // Cleanup if markdown code blocks exist
      text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      aiResult = JSON.parse(text);
    } catch (apiError) {
      console.error("PA Assistant AI Failed, using Hybrid Fallback Parser:", apiError.message);

      // Hybrid Fallback NLP
      let fallbackReply = "";
      let readyForSearch = false;
      const msgLower = message.toLowerCase();

      if (msgLower.includes("hello") || msgLower.includes("hi") || msgLower.includes("namaste")) {
        fallbackReply = "Namaste! I am your PA Assistant. Please tell me your age, income, and category so I can find schemes for you.";
      } else if (msgLower.includes("who made you")) {
        fallbackReply = "I was developed by Pratik Satalkar, and this project was co-founded by Asmita Jadhav!";
      } else {
        fallbackReply = "I am processing your details. ";
        // Try to extract numbers
        const numbers = msgLower.match(/\d+/g);
        if (numbers) {
          numbers.forEach(num => {
            const val = parseInt(num);
            if (val > 0 && val <= 100 && !userState.age) userState.age = val;
            else if (val >= 1000 && !userState.income) userState.income = val;
          });
          fallbackReply = "I noted down your numeric details. ";
        }
        if (msgLower.includes("open") || msgLower.includes("general") || msgLower.includes("obc") || msgLower.includes("sc") || msgLower.includes("st")) {
          if (msgLower.includes("obc")) userState.category = "OBC";
          else if (msgLower.includes("sc")) userState.category = "SC";
          else if (msgLower.includes("st")) userState.category = "ST";
          else userState.category = "General";
        }

        if (userState.age || userState.income) {
          readyForSearch = true;
          fallbackReply += "Let me search the registry for matching schemes...";
        } else {
          fallbackReply = "Could you please provide your age and income so I can match you with appropriate schemes?";
        }
      }

      aiResult = {
        updatedState: userState,
        reply: fallbackReply,
        readyForSearch: readyForSearch
      };
    }

    userState = { ...userState, ...aiResult.updatedState };
    responseText = aiResult.reply;

    // Sanitize numeric fields if AI extracted strings
    if (userState.age) userState.age = Number(userState.age);
    if (userState.income) userState.income = Number(userState.income);

    // Check if search is ready
    if (aiResult.readyForSearch) {
      const query = { isActive: true, $and: [] };

      if (userState.age) {
        query.$and.push({ 'rules.ageMin': { $lte: userState.age } }, { 'rules.ageMax': { $gte: userState.age } });
      }
      if (userState.income) {
        query.$and.push({ 'rules.incomeMax': { $gte: userState.income } });
      }
      if (userState.state) {
        query.$and.push({ 'rules.state': { $regex: new RegExp(`^${userState.state}$`, 'i') } });
      }
      if (userState.district) {
        query.$and.push({ 'rules.district': { $regex: new RegExp(`^${userState.district}$`, 'i') } });
      }
      if (userState.category && userState.category.toLowerCase() !== 'any') {
        query.$and.push({ 'rules.category': { $regex: new RegExp(`^${userState.category}$`, 'i') } });
      }

      // If we don't have enough strict criteria, just search generally
      if (query.$and.length === 0) {
        delete query.$and;
      }

      const schemes = await Scheme.find(query);
      foundSchemes = schemes;
      isCompleted = true;
      if (schemes.length > 0) {
        responseText += ` (I found ${schemes.length} schemes that match your profile!)`;
      }
    }

    // Save Log
    await ChatLog.create({
      userId: userId || null,
      sessionId: currentSessionId,
      userMessage: message,
      aiResponse: responseText,
      extractedData: userState
    });

    // 🌟 PERMANENT USER PROFILE SYNC
    // If we have a registered User ID, auto-save these small details back to their DB profile
    if (userId) {
      try {
        const updateData = {};
        if (userState.age) updateData.age = userState.age;
        if (userState.income) updateData.income = userState.income;
        if (userState.category && userState.category.toLowerCase() !== 'any') updateData.category = userState.category;
        if (userState.state) updateData.state = userState.state;
        if (userState.district) updateData.district = userState.district;
        if (userState.occupation) updateData.occupation = userState.occupation;

        if (Object.keys(updateData).length > 0) {
          await User.findByIdAndUpdate(userId, { $set: updateData }, { new: true });
        }
      } catch (err) {
        console.error("Failed to sync AI details to user profile", err);
      }
    }

    return res.json({
      responseText,
      updatedHistory: userState,
      schemes: foundSchemes,
      completed: isCompleted,
      sessionId: currentSessionId
    });

  } catch (error) {
    console.error('Chat Error:', error);
    // Graceful fallback instead of 500 crash
    return res.json({
      responseText: "I apologize, but I am currently experiencing technical difficulties connecting to my AI brain. Please try again in a moment.",
      updatedHistory: req.body.history || {},
      schemes: [],
      completed: false,
      sessionId: req.body.sessionId || uuidv4()
    });
  }
};
