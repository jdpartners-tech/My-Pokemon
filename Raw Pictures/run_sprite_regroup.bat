@echo off
cd /d "C:\Users\derek\Documents\Project\My Pokemon\Raw Pictures"
python regroup_and_rename.py >> regroup_log.txt 2>&1
echo Done: %date% %time% >> regroup_log.txt
