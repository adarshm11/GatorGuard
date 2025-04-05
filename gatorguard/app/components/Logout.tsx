"use client";
import { signOut } from "@/actions/auth";
import React, { useState } from "react";

const Logout = () => {
  const [loading, setLoading] = useState(false);

  const handleLogout = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    await signOut();
    setLoading(false);
  };

  return (
    <form onSubmit={handleLogout}>
      <button
        type="submit"
        disabled={loading}
        className="bg-gray-600 text-white text-sm px-4 py-2 rounded-md cursor-pointer w-full h-full hover:bg-black transition-colors duration-300 ease-in-out"
      >
        {loading ? "Signing out..." : "Sign out"}
      </button>
    </form>
  );
};

export default Logout;
