export interface ApprovedTeam {
  regnId: string;
  teamName: string;
}

export interface ApprovedRosterMember {
  regnId: string;
  teamName: string;
  email: string;
  isLeader: boolean;
}

/**
 * 28 Approved Event Teams derived from official registration records.
 * Team names retain exact original casing and punctuation (including dots and underscores).
 * NOTE: Squad names are public competition identifiers and contain zero PII.
 */
export const APPROVED_TEAMS: readonly ApprovedTeam[] = [
  {
    "regnId": "1767553-U59Z98GU",
    "teamName": "aaryamannkapoor11"
  },
  {
    "regnId": "1767553-U44Z9DL5",
    "teamName": "bhavyabisht345"
  },
  {
    "regnId": "1767553-UY1JV555",
    "teamName": "Bifrost"
  },
  {
    "regnId": "1767553-UB5TL001",
    "teamName": "Big Billion Days"
  },
  {
    "regnId": "1767553-UBD7K141",
    "teamName": "BOTGODS"
  },
  {
    "regnId": "1767553-UJG68Y21",
    "teamName": "Breaking Code"
  },
  {
    "regnId": "1767553-U1U4T4P4",
    "teamName": "BugHunters"
  },
  {
    "regnId": "1767553-UK59F7P1",
    "teamName": "Codingninjas"
  },
  {
    "regnId": "1767553-U2HI00E3",
    "teamName": "Cursed forge"
  },
  {
    "regnId": "1767553-UWD7677Y",
    "teamName": "ForkTheWorld"
  },
  {
    "regnId": "1767553-U4ZF180I",
    "teamName": "forzzi"
  },
  {
    "regnId": "1767553-U3ZN925A",
    "teamName": "gautamsaini7428"
  },
  {
    "regnId": "1767553-U1RA59Q5",
    "teamName": "kinderjoy"
  },
  {
    "regnId": "1767553-U62IZT15",
    "teamName": "krypto"
  },
  {
    "regnId": "1767553-U0K4L1Q5",
    "teamName": "Not Found"
  },
  {
    "regnId": "1767553-UL846WI1",
    "teamName": "Pirates of Web"
  },
  {
    "regnId": "1767553-UY86C44L",
    "teamName": "Ravagers"
  },
  {
    "regnId": "1767553-UC2H6Z06",
    "teamName": "rishit7070"
  },
  {
    "regnId": "1767553-UY19P95V",
    "teamName": "SupremeDevs"
  },
  {
    "regnId": "1767553-U58Q63CK",
    "teamName": "Team_Baapre"
  },
  {
    "regnId": "1767553-UC5A20O7",
    "teamName": "Touch Grass Inc."
  },
  {
    "regnId": "1767553-UL5V2W07",
    "teamName": "Unpaid Interns"
  },
  {
    "regnId": "1767553-U195D6AR",
    "teamName": "UNSTOPPABLE"
  },
  {
    "regnId": "1767553-U953M9WP",
    "teamName": "Untitled"
  },
  {
    "regnId": "1767553-US9OY076",
    "teamName": "Vote Chor"
  },
  {
    "regnId": "1767553-U5K549TJ",
    "teamName": "Xer0ne"
  },
  {
    "regnId": "1767553-UBI1079L",
    "teamName": "Zenophile"
  },
  {
    "regnId": "1767553-U7I75SF0",
    "teamName": "Zeroes and Ones"
  }
] as const;

/**
 * Sanitized development & test fixture roster.
 *
 * IMPORTANT SECURITY ARCHITECTURE NOTE:
 * The production participant roster is securely stored in the private Supabase
 * PostgreSQL database table ("ApprovedRosterMember").
 * To protect participant privacy when this repository is public on GitHub,
 * no personal email addresses or PII are stored in git.
 * In development and offline testing, the system uses these sanitized fixture accounts.
 */
export const APPROVED_ROSTER: readonly ApprovedRosterMember[] = [
  {
    "regnId": "1767553-U59Z98GU",
    "teamName": "aaryamannkapoor11",
    "email": "dev_aaryamannkapoor11_leader@fossclub.tech",
    "isLeader": true
  },
  {
    "regnId": "1767553-U59Z98GU",
    "teamName": "aaryamannkapoor11",
    "email": "dev_aaryamannkapoor11_member2@fossclub.tech",
    "isLeader": false
  },
  {
    "regnId": "1767553-U44Z9DL5",
    "teamName": "bhavyabisht345",
    "email": "dev_bhavyabisht345_leader@fossclub.tech",
    "isLeader": true
  },
  {
    "regnId": "1767553-UY1JV555",
    "teamName": "Bifrost",
    "email": "dev_bifrost_leader@fossclub.tech",
    "isLeader": true
  },
  {
    "regnId": "1767553-UY1JV555",
    "teamName": "Bifrost",
    "email": "dev_bifrost_member2@fossclub.tech",
    "isLeader": false
  },
  {
    "regnId": "1767553-UY1JV555",
    "teamName": "Bifrost",
    "email": "dev_bifrost_member3@fossclub.tech",
    "isLeader": false
  },
  {
    "regnId": "1767553-UY1JV555",
    "teamName": "Bifrost",
    "email": "dev_bifrost_member4@fossclub.tech",
    "isLeader": false
  },
  {
    "regnId": "1767553-UB5TL001",
    "teamName": "Big Billion Days",
    "email": "dev_big_billion_days_leader@fossclub.tech",
    "isLeader": true
  },
  {
    "regnId": "1767553-UB5TL001",
    "teamName": "Big Billion Days",
    "email": "dev_big_billion_days_member2@fossclub.tech",
    "isLeader": false
  },
  {
    "regnId": "1767553-UB5TL001",
    "teamName": "Big Billion Days",
    "email": "dev_big_billion_days_member3@fossclub.tech",
    "isLeader": false
  },
  {
    "regnId": "1767553-UB5TL001",
    "teamName": "Big Billion Days",
    "email": "dev_big_billion_days_member4@fossclub.tech",
    "isLeader": false
  },
  {
    "regnId": "1767553-UBD7K141",
    "teamName": "BOTGODS",
    "email": "dev_botgods_leader@fossclub.tech",
    "isLeader": true
  },
  {
    "regnId": "1767553-UBD7K141",
    "teamName": "BOTGODS",
    "email": "dev_botgods_member2@fossclub.tech",
    "isLeader": false
  },
  {
    "regnId": "1767553-UBD7K141",
    "teamName": "BOTGODS",
    "email": "dev_botgods_member3@fossclub.tech",
    "isLeader": false
  },
  {
    "regnId": "1767553-UBD7K141",
    "teamName": "BOTGODS",
    "email": "dev_botgods_member4@fossclub.tech",
    "isLeader": false
  },
  {
    "regnId": "1767553-UJG68Y21",
    "teamName": "Breaking Code",
    "email": "dev_breaking_code_leader@fossclub.tech",
    "isLeader": true
  },
  {
    "regnId": "1767553-UJG68Y21",
    "teamName": "Breaking Code",
    "email": "dev_breaking_code_member2@fossclub.tech",
    "isLeader": false
  },
  {
    "regnId": "1767553-U1U4T4P4",
    "teamName": "BugHunters",
    "email": "dev_bughunters_leader@fossclub.tech",
    "isLeader": true
  },
  {
    "regnId": "1767553-U1U4T4P4",
    "teamName": "BugHunters",
    "email": "dev_bughunters_member2@fossclub.tech",
    "isLeader": false
  },
  {
    "regnId": "1767553-U1U4T4P4",
    "teamName": "BugHunters",
    "email": "dev_bughunters_member3@fossclub.tech",
    "isLeader": false
  },
  {
    "regnId": "1767553-UK59F7P1",
    "teamName": "Codingninjas",
    "email": "dev_codingninjas_leader@fossclub.tech",
    "isLeader": true
  },
  {
    "regnId": "1767553-UK59F7P1",
    "teamName": "Codingninjas",
    "email": "dev_codingninjas_member2@fossclub.tech",
    "isLeader": false
  },
  {
    "regnId": "1767553-U2HI00E3",
    "teamName": "Cursed forge",
    "email": "dev_cursed_forge_leader@fossclub.tech",
    "isLeader": true
  },
  {
    "regnId": "1767553-U2HI00E3",
    "teamName": "Cursed forge",
    "email": "dev_cursed_forge_member2@fossclub.tech",
    "isLeader": false
  },
  {
    "regnId": "1767553-UWD7677Y",
    "teamName": "ForkTheWorld",
    "email": "dev_forktheworld_leader@fossclub.tech",
    "isLeader": true
  },
  {
    "regnId": "1767553-UWD7677Y",
    "teamName": "ForkTheWorld",
    "email": "dev_forktheworld_member2@fossclub.tech",
    "isLeader": false
  },
  {
    "regnId": "1767553-UWD7677Y",
    "teamName": "ForkTheWorld",
    "email": "dev_forktheworld_member3@fossclub.tech",
    "isLeader": false
  },
  {
    "regnId": "1767553-UWD7677Y",
    "teamName": "ForkTheWorld",
    "email": "dev_forktheworld_member4@fossclub.tech",
    "isLeader": false
  },
  {
    "regnId": "1767553-U4ZF180I",
    "teamName": "forzzi",
    "email": "dev_forzzi_leader@fossclub.tech",
    "isLeader": true
  },
  {
    "regnId": "1767553-U4ZF180I",
    "teamName": "forzzi",
    "email": "dev_forzzi_member2@fossclub.tech",
    "isLeader": false
  },
  {
    "regnId": "1767553-U3ZN925A",
    "teamName": "gautamsaini7428",
    "email": "dev_gautamsaini7428_leader@fossclub.tech",
    "isLeader": true
  },
  {
    "regnId": "1767553-U3ZN925A",
    "teamName": "gautamsaini7428",
    "email": "dev_gautamsaini7428_member2@fossclub.tech",
    "isLeader": false
  },
  {
    "regnId": "1767553-U3ZN925A",
    "teamName": "gautamsaini7428",
    "email": "dev_gautamsaini7428_member3@fossclub.tech",
    "isLeader": false
  },
  {
    "regnId": "1767553-U3ZN925A",
    "teamName": "gautamsaini7428",
    "email": "dev_gautamsaini7428_member4@fossclub.tech",
    "isLeader": false
  },
  {
    "regnId": "1767553-U1RA59Q5",
    "teamName": "kinderjoy",
    "email": "dev_kinderjoy_leader@fossclub.tech",
    "isLeader": true
  },
  {
    "regnId": "1767553-U1RA59Q5",
    "teamName": "kinderjoy",
    "email": "dev_kinderjoy_member2@fossclub.tech",
    "isLeader": false
  },
  {
    "regnId": "1767553-U62IZT15",
    "teamName": "krypto",
    "email": "dev_krypto_leader@fossclub.tech",
    "isLeader": true
  },
  {
    "regnId": "1767553-U62IZT15",
    "teamName": "krypto",
    "email": "dev_krypto_member2@fossclub.tech",
    "isLeader": false
  },
  {
    "regnId": "1767553-U0K4L1Q5",
    "teamName": "Not Found",
    "email": "dev_not_found_leader@fossclub.tech",
    "isLeader": true
  },
  {
    "regnId": "1767553-U0K4L1Q5",
    "teamName": "Not Found",
    "email": "dev_not_found_member2@fossclub.tech",
    "isLeader": false
  },
  {
    "regnId": "1767553-U0K4L1Q5",
    "teamName": "Not Found",
    "email": "dev_not_found_member3@fossclub.tech",
    "isLeader": false
  },
  {
    "regnId": "1767553-UL846WI1",
    "teamName": "Pirates of Web",
    "email": "dev_pirates_of_web_leader@fossclub.tech",
    "isLeader": true
  },
  {
    "regnId": "1767553-UL846WI1",
    "teamName": "Pirates of Web",
    "email": "dev_pirates_of_web_member2@fossclub.tech",
    "isLeader": false
  },
  {
    "regnId": "1767553-UL846WI1",
    "teamName": "Pirates of Web",
    "email": "dev_pirates_of_web_member3@fossclub.tech",
    "isLeader": false
  },
  {
    "regnId": "1767553-UY86C44L",
    "teamName": "Ravagers",
    "email": "dev_ravagers_leader@fossclub.tech",
    "isLeader": true
  },
  {
    "regnId": "1767553-UY86C44L",
    "teamName": "Ravagers",
    "email": "dev_ravagers_member2@fossclub.tech",
    "isLeader": false
  },
  {
    "regnId": "1767553-UY86C44L",
    "teamName": "Ravagers",
    "email": "dev_ravagers_member3@fossclub.tech",
    "isLeader": false
  },
  {
    "regnId": "1767553-UY86C44L",
    "teamName": "Ravagers",
    "email": "dev_ravagers_member4@fossclub.tech",
    "isLeader": false
  },
  {
    "regnId": "1767553-UC2H6Z06",
    "teamName": "rishit7070",
    "email": "dev_rishit7070_leader@fossclub.tech",
    "isLeader": true
  },
  {
    "regnId": "1767553-UC2H6Z06",
    "teamName": "rishit7070",
    "email": "dev_rishit7070_member2@fossclub.tech",
    "isLeader": false
  },
  {
    "regnId": "1767553-UY19P95V",
    "teamName": "SupremeDevs",
    "email": "dev_supremedevs_leader@fossclub.tech",
    "isLeader": true
  },
  {
    "regnId": "1767553-UY19P95V",
    "teamName": "SupremeDevs",
    "email": "dev_supremedevs_member2@fossclub.tech",
    "isLeader": false
  },
  {
    "regnId": "1767553-UY19P95V",
    "teamName": "SupremeDevs",
    "email": "dev_supremedevs_member3@fossclub.tech",
    "isLeader": false
  },
  {
    "regnId": "1767553-UY19P95V",
    "teamName": "SupremeDevs",
    "email": "dev_supremedevs_member4@fossclub.tech",
    "isLeader": false
  },
  {
    "regnId": "1767553-U58Q63CK",
    "teamName": "Team_Baapre",
    "email": "dev_team_baapre_leader@fossclub.tech",
    "isLeader": true
  },
  {
    "regnId": "1767553-U58Q63CK",
    "teamName": "Team_Baapre",
    "email": "dev_team_baapre_member2@fossclub.tech",
    "isLeader": false
  },
  {
    "regnId": "1767553-U58Q63CK",
    "teamName": "Team_Baapre",
    "email": "dev_team_baapre_member3@fossclub.tech",
    "isLeader": false
  },
  {
    "regnId": "1767553-UC5A20O7",
    "teamName": "Touch Grass Inc.",
    "email": "dev_touch_grass_inc_leader@fossclub.tech",
    "isLeader": true
  },
  {
    "regnId": "1767553-UC5A20O7",
    "teamName": "Touch Grass Inc.",
    "email": "dev_touch_grass_inc_member2@fossclub.tech",
    "isLeader": false
  },
  {
    "regnId": "1767553-UC5A20O7",
    "teamName": "Touch Grass Inc.",
    "email": "dev_touch_grass_inc_member3@fossclub.tech",
    "isLeader": false
  },
  {
    "regnId": "1767553-UL5V2W07",
    "teamName": "Unpaid Interns",
    "email": "dev_unpaid_interns_leader@fossclub.tech",
    "isLeader": true
  },
  {
    "regnId": "1767553-UL5V2W07",
    "teamName": "Unpaid Interns",
    "email": "dev_unpaid_interns_member2@fossclub.tech",
    "isLeader": false
  },
  {
    "regnId": "1767553-UL5V2W07",
    "teamName": "Unpaid Interns",
    "email": "dev_unpaid_interns_member3@fossclub.tech",
    "isLeader": false
  },
  {
    "regnId": "1767553-UL5V2W07",
    "teamName": "Unpaid Interns",
    "email": "dev_unpaid_interns_member4@fossclub.tech",
    "isLeader": false
  },
  {
    "regnId": "1767553-U195D6AR",
    "teamName": "UNSTOPPABLE",
    "email": "dev_unstoppable_leader@fossclub.tech",
    "isLeader": true
  },
  {
    "regnId": "1767553-U195D6AR",
    "teamName": "UNSTOPPABLE",
    "email": "dev_unstoppable_member2@fossclub.tech",
    "isLeader": false
  },
  {
    "regnId": "1767553-U195D6AR",
    "teamName": "UNSTOPPABLE",
    "email": "dev_unstoppable_member3@fossclub.tech",
    "isLeader": false
  },
  {
    "regnId": "1767553-U195D6AR",
    "teamName": "UNSTOPPABLE",
    "email": "dev_unstoppable_member4@fossclub.tech",
    "isLeader": false
  },
  {
    "regnId": "1767553-U953M9WP",
    "teamName": "Untitled",
    "email": "dev_untitled_leader@fossclub.tech",
    "isLeader": true
  },
  {
    "regnId": "1767553-U953M9WP",
    "teamName": "Untitled",
    "email": "dev_untitled_member2@fossclub.tech",
    "isLeader": false
  },
  {
    "regnId": "1767553-U953M9WP",
    "teamName": "Untitled",
    "email": "dev_untitled_member3@fossclub.tech",
    "isLeader": false
  },
  {
    "regnId": "1767553-US9OY076",
    "teamName": "Vote Chor",
    "email": "dev_vote_chor_leader@fossclub.tech",
    "isLeader": true
  },
  {
    "regnId": "1767553-US9OY076",
    "teamName": "Vote Chor",
    "email": "dev_vote_chor_member2@fossclub.tech",
    "isLeader": false
  },
  {
    "regnId": "1767553-US9OY076",
    "teamName": "Vote Chor",
    "email": "dev_vote_chor_member3@fossclub.tech",
    "isLeader": false
  },
  {
    "regnId": "1767553-U5K549TJ",
    "teamName": "Xer0ne",
    "email": "dev_xer0ne_leader@fossclub.tech",
    "isLeader": true
  },
  {
    "regnId": "1767553-U5K549TJ",
    "teamName": "Xer0ne",
    "email": "dev_xer0ne_member2@fossclub.tech",
    "isLeader": false
  },
  {
    "regnId": "1767553-U5K549TJ",
    "teamName": "Xer0ne",
    "email": "dev_xer0ne_member3@fossclub.tech",
    "isLeader": false
  },
  {
    "regnId": "1767553-U5K549TJ",
    "teamName": "Xer0ne",
    "email": "dev_xer0ne_member4@fossclub.tech",
    "isLeader": false
  },
  {
    "regnId": "1767553-UBI1079L",
    "teamName": "Zenophile",
    "email": "dev_zenophile_leader@fossclub.tech",
    "isLeader": true
  },
  {
    "regnId": "1767553-UBI1079L",
    "teamName": "Zenophile",
    "email": "dev_zenophile_member2@fossclub.tech",
    "isLeader": false
  },
  {
    "regnId": "1767553-UBI1079L",
    "teamName": "Zenophile",
    "email": "dev_zenophile_member3@fossclub.tech",
    "isLeader": false
  },
  {
    "regnId": "1767553-U7I75SF0",
    "teamName": "Zeroes and Ones",
    "email": "dev_zeroes_and_ones_leader@fossclub.tech",
    "isLeader": true
  },
  {
    "regnId": "1767553-U7I75SF0",
    "teamName": "Zeroes and Ones",
    "email": "dev_zeroes_and_ones_member2@fossclub.tech",
    "isLeader": false
  },
  {
    "regnId": "1767553-U7I75SF0",
    "teamName": "Zeroes and Ones",
    "email": "dev_zeroes_and_ones_member3@fossclub.tech",
    "isLeader": false
  },
  {
    "regnId": "1767553-U7I75SF0",
    "teamName": "Zeroes and Ones",
    "email": "dev_zeroes_and_ones_member4@fossclub.tech",
    "isLeader": false
  }
] as const;
