# SCHEME ADVISOR – AI-Based Government Scheme Finder System

## 📌 Project Overview

SCHEME ADVISOR is a full-stack web application designed to help users discover government schemes based on their eligibility and requirements. It uses AI-powered assistance and document processing to make scheme information easier to access.

## ✨ Key Features

- **Government Scheme Recommendations:** Helps users discover relevant schemes.
- **Eligibility Assistance:** Supports users in understanding scheme eligibility.
- **AI Integration:** Uses Google Gemini AI for AI-powered functionality.
- **Document Processing:** Uses Tesseract.js OCR to extract text from uploaded documents.
- **User Authentication:** Firebase Authentication.
- **Document and Media Uploads:** Cloudinary integration.
- **Backend API:** REST API developed with Node.js and Express.js.
- **Database:** MongoDB for data storage.

## 🛠️ Technologies Used

| Component       | Technology                      |
| --------------- | ------------------------------- |
| Frontend        | React.js, HTML, CSS, JavaScript |
| Backend         | Node.js, Express.js             |
| Database        | MongoDB                         |
| AI              | Google Gemini API               |
| OCR             | Tesseract.js                    |
| Authentication  | Firebase Authentication         |
| Media Storage   | Cloudinary                      |
| API Testing     | Postman                         |
| Version Control | Git and GitHub                  |

## 📂 Project Structure

```text
government-scheme-system/
├── backend/
│   ├── server.js
│   ├── package.json
│   └── ...
├── frontend/
│   ├── public/
│   ├── src/
│   └── package.json
├── .gitignore
└── README.md
```

## ⚙️ Prerequisites

Install the following before running the application:

- Node.js and npm
- MongoDB
- Git
- A code editor such as Visual Studio Code

Configure the required credentials for services used by the application, including Gemini AI, Firebase, and Cloudinary, as applicable.

## 🚀 How to Run the Project

### Step 1: Clone the Repository

```bash
git clone https://github.com/Asmita8983/government-scheme-system.git
cd government-scheme-system
```

### Step 2: Install Backend Dependencies

Open a terminal in the project root and run:

```bash
cd backend
npm install
```

### Step 3: Configure Environment Variables

Create a local `backend/.env` file if required by the backend. Add the environment variables expected by your code, such as the MongoDB connection string and required API credentials.

Configure the frontend environment variables separately if your React application requires them.

**Security:** Never upload `.env` files, API keys, passwords, or private credentials to GitHub.

### Step 4: Start MongoDB

Start your MongoDB service and ensure the connection string configured for the application is correct.

### Step 5: Start the Backend Server

From the `backend` directory, run:

```bash
node server.js
```

The backend is configured to use port `5000` according to the project setup.

### Step 6: Install Frontend Dependencies

Open a **new terminal** in the project root and run:

```bash
cd frontend
npm install
```

### Step 7: Start the Frontend

```bash
npm start
```

Open the local URL displayed in the terminal, commonly:

`http://localhost:3000`

## 🧪 API Testing

Postman can be used to test the backend API endpoints and validate request and response data.

##

##
