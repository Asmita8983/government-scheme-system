const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const runTest = async () => {
    try {
        console.log('🚀 Starting OCR Document Verification & Form Auto-fill Integration Test...');

        // 1. Register a new user
        const uniqueEmail = `test_ocr_${Date.now()}@example.com`;
        console.log(`👤 Registering test citizen: ${uniqueEmail}`);
        const regRes = await axios.post('http://localhost:5000/api/auth/register', {
            name: 'Aaditya Kumar',
            email: uniqueEmail,
            password: 'password123',
            confirmPassword: 'password123',
            mobileNumber: '9988776655'
        });

        const token = regRes.data.token;
        console.log('✅ Registration Successful. Token acquired.');

        // 2. Upload and OCR verify the Income Certificate
        console.log('📄 Preparing dummy income certificate...');
        const imagePath = path.join(__dirname, '..', 'income_certificate.png');
        if (!fs.existsSync(imagePath)) {
            console.error('❌ Image file not found at:', imagePath);
            return;
        }

        console.log('📤 Uploading document to /api/documents/verify...');
        const form = new FormData();
        form.append('frontImage', fs.createReadStream(imagePath), { filename: 'income_certificate.png' });

        const uploadRes = await axios.post('http://localhost:5000/api/documents/verify', form, {
            headers: {
                ...form.getHeaders(),
                Authorization: `Bearer ${token}`
            }
        });

        console.log('✅ Document Verifier Response Received!');
        console.log('🤖 OCR Verification Status:', uploadRes.data.data.verificationStatus);
        console.log('📈 Authenticity Score:', uploadRes.data.data.authenticityScore);
        console.log('🔍 Extracted Data:', JSON.stringify(uploadRes.data.data.extractedData, null, 2));

        const extracted = uploadRes.data.data.extractedData;

        // 3. Auto-fill and Save Profile
        console.log('💾 Triggering Profile Save with extracted OCR data...');
        const profileData = {
            age: 28,
            gender: 'Male',
            income: extracted.income, // 250000 extracted
            category: 'General',
            education: 'Graduate',
            occupation: 'Farmer',
            caste: 'Maratha',
            state: 'Maharashtra',
            district: 'Pune',
            aadhaarNumber: '1234 5678 9012',
            mobileNumber: '9988776655',
            dob: '15/08/1998'
        };

        const updateRes = await axios.put('http://localhost:5000/api/auth/profile', profileData, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        console.log('🎉 Profile Saved & Synchronized Successfully!');
        console.log('👤 Saved Profile in DB:', JSON.stringify(updateRes.data.profile, null, 2));

        if (updateRes.data.profile.income === 250000) {
            console.log('\n🌟 SUCCESS: OCR Income parsed & stored correctly as 250000! 🚀');
        } else {
            console.error('\n❌ FAILURE: Income mismatch. Expected 250000, got:', updateRes.data.profile.income);
        }

    } catch (error) {
        console.error('❌ Test Failed with Error:', error.response ? error.response.data : error.message);
    }
};

runTest();
