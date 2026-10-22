module.exports = (user, rules) => {
  const failedCriteria = [];
  const reasons = [];

  if (rules.ageMin && user.age < rules.ageMin)
    failedCriteria.push("Age below minimum");
  else if (rules.ageMin)
    reasons.push("Age criteria matched");

  if (rules.ageMax && user.age > rules.ageMax)
    failedCriteria.push("Age above limit");

  if (rules.incomeMax && user.income > rules.incomeMax)
    failedCriteria.push("Income exceeds limit");
  else if (rules.incomeMax)
    reasons.push("Income criteria matched");

  if (rules.gender !== "Any" && user.gender !== rules.gender)
    failedCriteria.push("Gender mismatch");
  else if (rules.gender !== "Any")
    reasons.push("Gender criteria matched");

  if (rules.category !== "Any" && user.category !== rules.category)
    failedCriteria.push("Category mismatch");
  else if (rules.category !== "Any")
    reasons.push("Category criteria matched");

  if (rules.state && rules.state !== "Any" && user.state && user.state !== rules.state)
    failedCriteria.push("State mismatch");
  else if (rules.state && rules.state !== "Any")
    reasons.push("State criteria matched");

  if (rules.district && rules.district !== "Any" && user.district && user.district !== rules.district)
    failedCriteria.push("District mismatch");
  else if (rules.district && rules.district !== "Any")
    reasons.push("District criteria matched");

  return {
    isEligible: failedCriteria.length === 0,
    failedCriteria,
    reasons
  };
};
