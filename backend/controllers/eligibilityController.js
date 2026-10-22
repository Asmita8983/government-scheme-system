const Scheme = require("../models/Scheme");
const evaluateEligibility = require("../utils/ruleEngine");

exports.getEligibleSchemes = async (req, res) => {
  try {
    const userProfile = req.body;
    const schemes = await Scheme.find();

    const result = schemes.map((scheme) => ({
      name: scheme.name,
      description: scheme.description,
      benefit: scheme.benefit,
      eligible: evaluateEligibility(userProfile, scheme.rules),
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};
