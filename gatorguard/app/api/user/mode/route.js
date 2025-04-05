import { createClient } from "@/app/utils/supabase/server";
import { NextResponse } from "next/server";

// GET endpoint to retrieve the user's current mode settings
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get the user's mode settings
    const { data: userMode, error: modeError } = await supabase
      .from("user_mode")
      .select("mode_select, study_submode_select, lyrics_status")
      .eq("id", user.id)
      .single();

    if (modeError) {
      // If no record found, it's not necessarily an error
      if (modeError.code === "PGRST116") {
        // Return default values if no record exists
        return NextResponse.json({
          mode: "work",
          study_submode_select: null,
          lyrics_status: false,
        });
      }

      console.error("Error fetching user mode:", modeError);
      return NextResponse.json(
        { error: "Failed to fetch user mode" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      mode: userMode?.mode_select || "work", // Default to work mode if not set
      study_submode_select: userMode?.study_submode_select || null,
      lyrics_status: userMode?.lyrics_status || false,
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Server error occurred" },
      { status: 500 }
    );
  }
}

// POST endpoint to update the user's mode
export async function POST(request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Parse the request body
    const requestData = await request.json();
    const { mode, study_submode_select, lyrics_status } = requestData;

    if (!mode) {
      return NextResponse.json({ error: "Mode is required" }, { status: 400 });
    }

    // Validate mode
    const validModes = ["work", "study", "leisure"];
    if (!validModes.includes(mode)) {
      return NextResponse.json(
        { error: "Invalid mode. Must be one of: work, study, leisure" },
        { status: 400 }
      );
    }

    // Check if user record exists
    const { data: existingMode } = await supabase
      .from("user_mode")
      .select("id")
      .eq("id", user.id)
      .single();

    let result;

    if (existingMode) {
      // Update existing record
      const { data, error } = await supabase
        .from("user_mode")
        .update({
          mode_select: mode,
          study_submode_select:
            study_submode_select !== undefined ? study_submode_select : null,
          lyrics_status: lyrics_status !== undefined ? lyrics_status : null,
        })
        .eq("id", user.id);

      result = { data, error };
    } else {
      // Insert new record
      const { data, error } = await supabase.from("user_mode").insert({
        id: user.id,
        mode_select: mode,
        study_submode_select: study_submode_select || null,
        lyrics_status: lyrics_status !== undefined ? lyrics_status : false,
      });

      result = { data, error };
    }

    if (result.error) {
      console.error("Error updating mode:", result.error);
      return NextResponse.json(
        { error: "Failed to update mode" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      mode,
      study_submode_select: study_submode_select || null,
      lyrics_status: lyrics_status !== undefined ? lyrics_status : false,
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Server error occurred" },
      { status: 500 }
    );
  }
}
