import React from "react";

const SchemeCard = ({ scheme }) => {
  return (
    <div className="scheme-card">
      <h3>{scheme.name}</h3>
      <p>{scheme.description}</p>
      <p><b>Benefit:</b> {scheme.benefit}</p>
      <p className={scheme.eligible ? "yes" : "no"}>
        {scheme.eligible ? "Eligible" : "Not Eligible"}
      </p>
    </div>
  );
};

export default SchemeCard;
