/**
 * Verhoeff Algorithm Implementation for Aadhaar Checksum Validation
 */
const d = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
    [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
    [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
    [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
    [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
    [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
    [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
    [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
    [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
];

const p = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
    [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
    [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
    [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
    [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
    [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
    [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
];

const inv = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];

const validateVerhoeff = (num) => {
    let c = 0;
    let myArray = String(num).split("").map(Number).reverse();
    for (let i = 0; i < myArray.length; i++) {
        c = d[c][p[i % 8][myArray[i]]];
    }
    return c === 0;
};

/**
 * Validates Aadhaar Details
 * @param {Object} data - Extracted data object containing aadhaarNumber, name, dob, gender
 * @returns {Object} - Validation result
 */
const validateAadhaarDetails = (data) => {
    const result = {
        isValid: true,
        errors: [],
        details: {}
    };

    // 1. Aadhaar Number Validation
    if (!data.aadhaarNumber) {
        result.details.aadhaarNumber = { valid: false, message: "Missing Aadhaar Number" };
        result.isValid = false;
        result.errors.push("Missing Aadhaar Number");
    } else {
        const cleanAadhaar = data.aadhaarNumber.replace(/\s/g, '');
        if (!/^\d{12}$/.test(cleanAadhaar)) {
            result.details.aadhaarNumber = { valid: false, message: "Aadhaar must be exactly 12 digits" };
            result.isValid = false;
            result.errors.push("Aadhaar must be exactly 12 digits");
        } else if (!validateVerhoeff(cleanAadhaar)) {
            result.details.aadhaarNumber = { valid: false, message: "Invalid Aadhaar Number (Verhoeff Checksum Failed)" };
            result.isValid = false;
            result.errors.push("Invalid Aadhaar Number (Check sum failed)");
        } else {
            result.details.aadhaarNumber = { valid: true, message: "Valid 12-digit Aadhaar with Checksum" };
        }
    }

    // 2. Name Validation
    if (data.name) {
        if (!/^[a-zA-Z\s]+$/.test(data.name)) {
            result.details.name = { valid: false, message: "Name contains invalid characters (Only alphabets allowed)" };
            // Depending on strictness, might not fail entire validation if OCR is messy
            // result.isValid = false; 
        } else {
            result.details.name = { valid: true, message: "Valid Name Format" };
        }
    }

    // 3. DOB Validation
    if (data.dob) {
        // Formats: DD/MM/YYYY or YYYY
        const dobRegexFull = /^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/;
        const dobRegexYear = /^\d{4}$/;

        let year = 0;
        let validFormat = false;

        if (dobRegexFull.test(data.dob)) {
            validFormat = true;
            year = parseInt(data.dob.match(dobRegexFull)[3]);
        } else if (dobRegexYear.test(data.dob)) {
            validFormat = true;
            year = parseInt(data.dob);
        }

        if (!validFormat) {
            result.details.dob = { valid: false, message: "Invalid DOB Format (Use DD/MM/YYYY or YYYY)" };
            result.isValid = false;
        } else {
            const currentYear = new Date().getFullYear();
            const age = currentYear - year;
            if (age < 0 || age > 120) {
                result.details.dob = { valid: false, message: `Invalid Age: ${age} years` };
                result.isValid = false;
            } else {
                result.details.dob = { valid: true, message: `Valid DOB (Age: ${age})` };
            }
        }
    }

    // 4. Gender Validation
    if (data.gender) {
        const gender = data.gender.toLowerCase();
        if (["male", "female", "transgender", "m", "f", "t"].includes(gender)) {
            result.details.gender = { valid: true, message: "Valid Gender" };
        } else {
            result.details.gender = { valid: false, message: "Invalid Gender" };
            result.isValid = false;
        }
    }

    return result;
};

module.exports = { validateAadhaarDetails };
