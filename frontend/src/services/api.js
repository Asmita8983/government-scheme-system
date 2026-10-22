import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000",
});

export const checkEligibility = (profile) =>
  API.post("/api/check-eligibility", profile);

export default API;
