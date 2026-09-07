# Generate MOM — Checklist

## Agent: Recorder (MOM Agent)

### Source Material
- [ ] project-docs/ scanned for transcripts, recordings, and notes
- [ ] User confirmed source material, MOM type, and project name
- [ ] Meeting date confirmed (provided, extracted, or defaulted to today)
- [ ] Input restricted to project-docs/ or pasted text only

### Analysis
- [ ] All participants identified and listed
- [ ] Every discussion topic from the source is captured
- [ ] Timestamps extracted and normalized to [HH:MM:SS] format
- [ ] Analysis summary presented to user

### MOM Content — Structure
- [ ] MOM follows _sdet/data/templates/mom-template.md format
- [ ] Header complete (project, session, date, participants, meeting type)
- [ ] Executive summary accurately reflects the session
- [ ] Discussion topics numbered with timestamps on headings

### MOM Content — Decisions & Actions
- [ ] Decisions marked with checkmarks and consolidated in recap
- [ ] Every action item has an owner assigned
- [ ] Action items table includes Timestamp, Owner, and Deadline columns
- [ ] Decisions and open questions kept in separate sections
- [ ] Ambiguous or unresolved items captured in Open Items / Parking Lot

### Output
- [ ] MOM saved as .md to outputs/mom-agent/date-mom/ or feature-mom/
- [ ] DOCX generated via scripts/md-to-docx.py
- [ ] Summary metrics presented to user
- [ ] Google Chat webhook notification sent (if configured)
- [ ] Handoff to Narrator (generate-user-stories) suggested
