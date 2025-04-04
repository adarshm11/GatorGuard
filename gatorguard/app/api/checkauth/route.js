import { createClient } from "@/app/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.getUser();
  
      if (error || !data.user) {
        return NextResponse.json(
          {
            authenticated: false,
          },
          { status: 401 }
        );
      }
  
      return NextResponse.json(
        {
          authenticated: true,
          user: {
            id: data.user.id,
            email: data.user.email,
            username: data.user.user_metadata?.username,
          },
        },
        { status: 200 }
      );
    } catch (error) {
      return NextResponse.json(
        {
          authenticated: false,
          error: "Authentication check failed" + error,
        },
        { status: 500 }
      );
    }
  }
  