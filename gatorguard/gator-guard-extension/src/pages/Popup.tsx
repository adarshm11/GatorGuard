import React from "react";
// import Header from "../components/Header";
import MainContent from "../components/MainContent";

const Popup: React.FC = () => {
  return (
    <div className="flex flex-col h-[600px] w-[400px] p-4">
      {/* <Header /> */}
      <MainContent />
    </div>
  );
};

export default Popup;
