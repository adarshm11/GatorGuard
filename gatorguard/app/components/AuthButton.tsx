import React from "react";

const AuthButton = ({
  type,
  loading,
}: {
  type: "Login" | "Sign up" | "Reset Password" | "Forgot Password";
  loading: boolean;
}) => {
  return (
    <button
      disabled={loading}
      type="submit"
      className={`cursor-pointer ${
        loading ? "bg-gray-600" : "bg-blue-600"
      } rounded-md w-full px-12 py-3 text-sm font-medium text-white`}
    >
      {loading ? "Loading..." : type}
    </button>
  );
};

export default AuthButton;
