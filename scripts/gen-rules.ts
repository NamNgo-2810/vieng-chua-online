/**
 * Regenerate the config-derived parts of database.rules.json (src/lib/merit-rules.ts):
 * the merit, templeMerit, notes and notesThrottle blocks, and players'
 * currentActivity, area, emote and emoteAt fields.
 * Run after changing config/merit.ts, ritual-spots.ts, activities.ts, areas.ts
 * or milestones.ts:  npm run rules:gen
 * Everything else (other player fields, chat, ...) is left as it is.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { meritRules, playerFieldRules, notesRules } from "../src/lib/merit-rules";

const path = join(__dirname, "..", "database.rules.json");
const file = JSON.parse(readFileSync(path, "utf8"));
Object.assign(file.rules, meritRules(), notesRules());
Object.assign(file.rules.players.$sessionId, playerFieldRules());
writeFileSync(path, JSON.stringify(file, null, 2) + "\n");
console.log("database.rules.json: merit rules regenerated");
