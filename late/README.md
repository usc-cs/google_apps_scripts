## Late Submission Verification Script

Forgive me, but this script is not very modular yet. I'll do my best to describe how to set up.

### Configuration

First, open the `late.gs` file. There are couple of things that needs to be modified for each semester. 

1. homework deadlines, defined in line 49-58
2. location for the homework commit time check script, defined in line 74
3. access token for github, defined in line 166. Follow these instructions to obtain one: https://help.github.com/articles/creating-an-access-token-for-command-line-use/

### Setup

#### Create a Google Form

Createa a Google Form with the following questions:

- USC username
- Github username
- Homework #
	- This should be a radio button question, with the options matching the homework deadline keys in configuration step 2
- Commit SHA
- Additional notes / comments

The order and the name of each field **needs to be exactly the same as above**. Make sure the options "Require USC login to view this form" and "Automatically collect respondant's USC username" is checked on top. 

#### Setting up the spreadsheet

Then, open the responses spreadsheet, and add the following columns to the right of "Additional Notes":

- Due Date [AUTO]
- Push Date [AUTO]
- Late
- Left
- Status
- CSV

Create a new sheet, and call it "Late Days Count", which should contain the following columns:

- Last Name
- First Name
- USC username
- Late Days Used
- Late Days Left

Copy in the students' info for the first three columns. For the 4th column, enter the following formula for each row:

```
=SUMIF('Form Responses 1'!C:C, C2, 'Form Responses 1'!J:J)
```

For the 5th column, enter the following formula for each row:

```
=4-D2
```

(`C2` and `D2` should automatically change as you drag the formula down the sheet.

#### Setting up the script

In the responses spreadsheet, find **Tools -> Script editor**. Copy the contents of the configured script from the first step and paste it in the code editor that's now opened. 

Then, find Resources -> Current project's triggers, and add the following trigger:

- `setupMenu`, From Spreadsheet, On open

Save and close the tab. Refresh the responses spreadsheet, and you should now find "CS 104" as a menu option in the menu bar, next to "File", "Edit", etc.

#### Using the script

The general workflow is as follows:

1. Student will submit their late submission request with the form
2. On late submission deadline, the instructor should select all the rows newly submitted and press **CS 104 -> Fetch Push Times**
3. The script will automatically attempt to find the commit and determine how late it is, and prepopulate the row
4. The instructor should then find out how many late days is left
	- the following formula will be useful: `=VLOOKUP(C2,'Late Days Count'!C:E, 3, false)`, where again, `C2` should be automatically populated
5. Then, on verification that the submission is valid, choose an option from the **CS 104** menu. The script will automatically submit a Github issue notifying the student whether the reqeust is successful or not.
