using System;
using System.Collections.Generic;
using System.Text;

namespace TwinAml
{
    public sealed class AlertWork
    {
        public string AlertId = "";
        public string DecisionKey = "";
        public string Note = "";
        public int OpenOrder;
        public List<string> Marked = new List<string>();
        public HashSet<string> Panels = new HashSet<string>();
    }

    public sealed class ShiftScore
    {
        public int Priority;
        public int Flags;
        public int Depth;
        public int Decisions;
        public int Notes;
        public int Overall;
        public bool HardFail;
        public string HardReason = "";
        public string Verdict = "";
        public string ScoreLine = "";
        public string Suggestion = "";
        public string TimeLine = "";
        public List<string> Lines = new List<string>();
    }

    /// <summary>
    /// One Topic 4 shift. Static so the report scene can read it after the room unloads.
    /// The twin itself is still the schema 0.1 mirror on the session.
    /// </summary>
    public static class TriageShift
    {
        public static List<TriageAlert> Alerts = new List<TriageAlert>();
        public static List<AlertWork> Work = new List<AlertWork>();
        public static long StartedMs;
        public static bool ClockOn;
        public static bool Finished;
        public static int OpenCounter;
        public static ShiftScore Score;

        public static void Clear()
        {
            Alerts = new List<TriageAlert>();
            Work = new List<AlertWork>();
            StartedMs = 0;
            ClockOn = false;
            Finished = false;
            OpenCounter = 0;
            Score = null;
        }

        public static void Begin(JsonValue script)
        {
            Clear();
            Alerts = TriageLibrary.Read(script);
            for (var i = 0; i < Alerts.Count; i++)
            {
                var work = new AlertWork();
                work.AlertId = Alerts[i].Id;
                Work.Add(work);
            }
        }

        public static void StartClock()
        {
            if (StartedMs == 0) StartedMs = NowMs();
            ClockOn = true;
        }

        public static int ElapsedSec()
        {
            if (StartedMs <= 0) return 0;
            var delta = NowMs() - StartedMs;
            if (delta < 0) delta = 0;
            return (int)(delta / 1000L);
        }

        public static AlertWork WorkFor(string alertId)
        {
            for (var i = 0; i < Work.Count; i++)
            {
                if (Work[i].AlertId == alertId) return Work[i];
            }
            return null;
        }

        public static TriageAlert Alert(string alertId)
        {
            for (var i = 0; i < Alerts.Count; i++)
            {
                if (Alerts[i].Id == alertId) return Alerts[i];
            }
            return null;
        }

        public static int DecidedCount()
        {
            var n = 0;
            for (var i = 0; i < Work.Count; i++)
            {
                if (!string.IsNullOrEmpty(Work[i].DecisionKey)) n++;
            }
            return n;
        }

        public static bool AllDecided()
        {
            return Alerts.Count == 6 && DecidedCount() == 6;
        }

        public static List<string> ChoiceIds()
        {
            var list = new List<string>();
            for (var i = 0; i < Alerts.Count; i++)
            {
                var work = WorkFor(Alerts[i].Id);
                var key = work != null ? work.DecisionKey : "";
                string choice;
                if (!Alerts[i].ScriptChoice.TryGetValue(key, out choice))
                    throw new EffectException("No script choice for " + Alerts[i].Id + " " + key + ".");
                list.Add(choice);
            }
            return list;
        }

        public static List<TriageAlert> Sorted(string sort)
        {
            var list = new List<TriageAlert>();
            for (var i = 0; i < Alerts.Count; i++) list.Add(Alerts[i]);
            if (sort == "amount")
                list.Sort(delegate(TriageAlert a, TriageAlert b) { return b.AmountHkd.CompareTo(a.AmountHkd); });
            else if (sort == "deadline")
                list.Sort(delegate(TriageAlert a, TriageAlert b) { return a.DeadlineRank.CompareTo(b.DeadlineRank); });
            else if (sort == "risk")
                list.Sort(delegate(TriageAlert a, TriageAlert b) { return a.PriorityRank.CompareTo(b.PriorityRank); });
            else if (sort == "region")
                list.Sort(delegate(TriageAlert a, TriageAlert b) { return string.CompareOrdinal(a.Region, b.Region); });
            return list;
        }

        public static ShiftScore BuildScore()
        {
            var score = new ShiftScore();
            TriageAlert first = null;
            for (var i = 0; i < Alerts.Count; i++)
            {
                var work = WorkFor(Alerts[i].Id);
                if (work != null && work.OpenOrder == 1) first = Alerts[i];
            }
            if (first == null) score.Priority = 0;
            else if (first.Id == "A5" || first.Id == "A1" || first.Id == "A6") score.Priority = 100;
            else if (first.Id == "A2") score.Priority = 70;
            else if (first.Id == "A4") score.Priority = 40;
            else score.Priority = 15;

            var flagSum = 0;
            var depthSum = 0;
            var decisionSum = 0;
            var noteSum = 0;
            var closed = 0;
            var reportedNameOnly = false;
            for (var i = 0; i < Alerts.Count; i++)
            {
                var alert = Alerts[i];
                var work = WorkFor(alert.Id);
                var marked = 0;
                for (var f = 0; f < alert.RedFlags.Count; f++)
                {
                    if (work != null && work.Marked.Contains(alert.RedFlags[f].Id)) marked++;
                }
                flagSum += alert.RedFlags.Count == 0 ? 0 : (100 * marked) / alert.RedFlags.Count;

                var panels = 0;
                if (work != null)
                {
                    if (work.Panels.Contains("tx")) panels++;
                    if (work.Panels.Contains("kyc")) panels++;
                    if (work.Panels.Contains("map")) panels++;
                    if (work.Panels.Contains("links")) panels++;
                    if (work.Panels.Contains("screen")) panels++;
                }
                if (panels > 4) panels = 4;
                depthSum += 25 * panels;

                var grade = work != null ? alert.Grade(work.DecisionKey) : "miss";
                if (grade == "correct") decisionSum += 100;
                else if (grade == "acceptable") decisionSum += 60;
                if (work != null && work.DecisionKey == "close") closed++;
                if (alert.Id == "A5" && work != null && work.DecisionKey == "report") reportedNameOnly = true;

                var len = work != null && work.Note != null ? work.Note.Trim().Length : 0;
                var note = 40;
                if (len >= 50) note = 60;
                if (len >= 80) note = 80;
                if (len >= 140) note = 100;
                noteSum += note;

                score.Lines.Add(LineFor(alert, work, marked));
            }

            var n = Alerts.Count > 0 ? Alerts.Count : 1;
            score.Flags = flagSum / n;
            score.Depth = depthSum / n;
            score.Decisions = decisionSum / n;
            score.Notes = noteSum / n;
            score.Overall = (int)Math.Round(
                0.15 * score.Priority +
                0.25 * score.Flags +
                0.20 * score.Depth +
                0.25 * score.Decisions +
                0.15 * score.Notes);

            if (closed > 0)
            {
                score.HardFail = true;
                score.HardReason = "You closed " + closed + " file" + (closed == 1 ? "" : "s") + ". None of these six had a clear, consistent explanation.";
            }
            if (reportedNameOnly)
            {
                score.HardFail = true;
                var extra = "You drafted an STR on A5 because the names look similar. The date of birth and the document do not match. A similar name alone is not reasonable suspicion.";
                score.HardReason = score.HardReason.Length == 0 ? extra : score.HardReason + " " + extra;
            }

            var pass = !score.HardFail && score.Overall >= 60;
            if (pass)
                score.Verdict = "Pass. Training score " + score.Overall + " of 100. This is a classroom score, not a regulatory grade.";
            else if (score.HardFail)
                score.Verdict = "Not a pass. Training score " + score.Overall + " of 100. " + score.HardReason;
            else
                score.Verdict = "Not a pass. Training score " + score.Overall + " of 100. A pass on this shift is 60 or above, with no closed file and no STR filed on the name-only screening hit.";

            score.ScoreLine =
                "Priority " + score.Priority +
                "  ·  Red flags " + score.Flags +
                "  ·  Sources opened " + score.Depth +
                "  ·  Decisions " + score.Decisions +
                "  ·  Notes " + score.Notes +
                "    (weights 15 / 25 / 20 / 25 / 15)";

            score.Suggestion = Suggest(score, first);
            var mins = ElapsedSec() / 60;
            var secs = ElapsedSec() % 60;
            score.TimeLine = "Time from sitting down: " + mins + " min " + secs.ToString("00") +
                ". The shift is built for about 20 to 30 minutes. A slower first reading is fine.";
            if (mins < 8)
                score.TimeLine += " You finished very quickly. Next time, open the map and the link board before you decide.";

            Score = score;
            return score;
        }

        public static List<string> Feedback(string alertId)
        {
            var lines = new List<string>();
            var alert = Alert(alertId);
            var work = WorkFor(alertId);
            if (alert == null || work == null)
            {
                lines.Add("This alert is not on the shift.");
                return lines;
            }
            var grade = alert.Grade(work.DecisionKey);
            var head = "Your decision: " + TriageLibrary.DecisionLabel(work.DecisionKey) + ". ";
            if (grade == "correct") head += "That matches the standard path for this file.";
            else if (grade == "acceptable") head += "That is a reasonable path. It is not the best first step on this file.";
            else head += "That does not fit this file.";
            lines.Add(head);
            string why;
            if (alert.Why.TryGetValue(work.DecisionKey, out why)) lines.Add(why);

            var marked = new StringBuilder();
            var missed = new StringBuilder();
            for (var i = 0; i < alert.RedFlags.Count; i++)
            {
                var flag = alert.RedFlags[i];
                if (work.Marked.Contains(flag.Id))
                {
                    if (marked.Length > 0) marked.Append("\n");
                    marked.Append("Marked: ").Append(flag.Title).Append(" — ").Append(flag.Why);
                }
                else
                {
                    if (missed.Length > 0) missed.Append("\n");
                    missed.Append("Not marked: ").Append(flag.Title).Append(" — ").Append(flag.Evidence);
                }
            }
            if (marked.Length == 0) lines.Add("You did not mark a red flag on this file.");
            else lines.Add(marked.ToString());
            if (missed.Length > 0) lines.Add(missed.ToString());

            if (alert.ReviewSteps.Count > 0)
            {
                var steps = new StringBuilder();
                steps.Append("A careful pass looks like this:");
                for (var i = 0; i < alert.ReviewSteps.Count; i++)
                {
                    steps.Append("\n");
                    steps.Append(i + 1).Append(". ").Append(alert.ReviewSteps[i]);
                }
                lines.Add(steps.ToString());
            }

            lines.Add("Example note, to read after your own note is saved:\n" + alert.SampleNote);
            if (!string.IsNullOrEmpty(work.Note))
                lines.Add("Your note:\n" + work.Note.Trim());
            lines.Add("Do not tell the customer that an STR was drafted or might be drafted. That disclosure is called tipping off. This room only writes a training flag. It does not contact a financial intelligence unit.");
            return lines;
        }

        static string LineFor(TriageAlert alert, AlertWork work, int marked)
        {
            var decision = work != null ? TriageLibrary.DecisionLabel(work.DecisionKey) : "Not decided";
            var grade = work != null ? alert.Grade(work.DecisionKey) : "miss";
            var word = grade == "correct" ? "standard path" : grade == "acceptable" ? "reasonable, not the best first step" : "does not fit";
            return alert.Id + "  " + alert.Title + "  —  " + decision + "  —  " + word +
                ".  Red flags marked " + marked + " of " + alert.RedFlags.Count + ".";
        }

        static string Suggest(ShiftScore score, TriageAlert first)
        {
            var lowest = "flags";
            var value = score.Flags;
            if (score.Depth < value) { lowest = "depth"; value = score.Depth; }
            if (score.Decisions < value) { lowest = "decisions"; value = score.Decisions; }
            if (score.Notes < value) { lowest = "notes"; value = score.Notes; }
            if (score.Priority < value) lowest = "priority";

            var firstName = first != null ? first.Id + " " + first.Title : "no file";
            if (lowest == "priority")
                return "You opened " + firstName + " first. A same-day sanctions hit (A5) or a fast outflow (A1 or A6) comes before a file that is only missing paperwork (A3). Amount is not the same thing as urgency.";
            if (lowest == "depth")
                return "Open the map and the link board before you decide. Shared addresses and where the money goes are easy to miss on the transaction list alone.";
            if (lowest == "decisions")
                return "Match the path to the evidence. Ask for documents when the papers do not agree. Escalate when several red flags or a network remain. Draft an STR when you suspect criminal proceeds or terrorist financing. Do not close a file that still has no explanation, and do not file because two names look alike.";
            if (lowest == "notes")
                return "Write the facts, the gap, and the next step. A colleague should be able to see why you chose that path without opening the file again.";
            return "You are leaving red flags unmarked. Tick a flag only when you can point to it in the transactions, the customer file, the map, or the links.";
        }

        static long NowMs()
        {
            return (long)(DateTime.UtcNow - new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc)).TotalMilliseconds;
        }
    }
}
