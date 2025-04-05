import Link from "next/link";
import React from "react";
import { createClient } from "../utils/supabase/server";
import Logout from "./Logout";

const Navbar = async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const LinkClass = "rounded-md hover:text-white py-2 px-3 transition-colors duration-300 ease-in-out"

  return (
    <nav className="bg-yellow-600 w-full flex items-center mt-4 rounded-lg shadow-2xl">
      <div className="flex w-full items-center justify-between px-8 py-4">
        <div className="flex-shrink-0">
          <Link className={"font-bold " + LinkClass} href="/">
            Home
          </Link>
        </div>

        <div className="flex items-center gap-x-6">
          <Link className={LinkClass} href="/private">Private</Link>
        
          {!user ? (
            <Link href="/login">
              <div className={"text-sm" + LinkClass}>
                Login
              </div>
            </Link>
          ) : (
            <>
              <div className="flex items-center gap-x-2 text-sm">
                {user?.email}
              </div>
              <Logout />
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
