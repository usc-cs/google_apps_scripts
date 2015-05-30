function setupMenu() {
  var ui = SpreadsheetApp.getUi();
  // Or DocumentApp or FormApp.
  ui.createMenu('CS 104')
  .addItem('Fetch Push Times', 'fetchPushTimesMenuItem')
  .addSeparator()
  .addItem('Confirm Rows', 'confirmMenuItem')
  .addItem('Failure: Invalid SHA', 'invalidShaMenuItem')
  .addItem('Failure: Not enough late days', 'notEnoughLateDaysMenuItem')
  .addItem('Failure: > 2 days', 'only2LateDaysAllowedMenuItem')
  .addToUi();
}

function fetchPushTimesMenuItem() {
  var activeRange = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet().getActiveRange();
  verifyLateSubmissions(activeRange.getRowIndex(), activeRange.getLastRow());
}

function invalidShaMenuItem() {
  var activeRange = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet().getActiveRange();
  var message = 'The SHA that you provided is invalid. Please make sure you have pushed this commit on Github and that you can see the commit in your commit history.';
  postInvalidIssue('Invalid SHA', message, activeRange.getRowIndex(), activeRange.getLastRow());
}

function notEnoughLateDaysMenuItem() {
  var activeRange = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet().getActiveRange();
  var message = 'You do not have enough late days.';
  postInvalidIssue('Not enough late days', message, activeRange.getRowIndex(), activeRange.getLastRow());
}

function only2LateDaysAllowedMenuItem() {
  var activeRange = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet().getActiveRange();
  var message = 'You may only use a maximum of 2 late days per assignment. Anything more than 2 days late will not be accepted.';
  postInvalidIssue('More than 2 days late', message, activeRange.getRowIndex(), activeRange.getLastRow());
}

function confirmMenuItem() {
  var activeRange = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet().getActiveRange();
  postConfirmIssue(activeRange.getRowIndex(), activeRange.getLastRow());
}
  

function verifyLateSubmissions(startRow, endRow) {
  startRow = parseInt(startRow);
  endRow = parseInt(endRow);
  var ss = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var all_range = ss.getRange(1, 1, ss.getMaxRows(), ss.getMaxColumns());
  var ALLOWED_COLUMNS = ['Timestamp', 'Username', 'Student USC username', 'Student name', 'Lab'];
  var deadlines = {
    'HW 1': '2015-01-23 23:59:59',
    'HW 2': '2015-02-04 01:00:00',
    'HW 3': '2015-02-14 01:00:00',
    'HW 4 (Project 1)': '2015-03-03 01:00:00',
    'HW 5 (Project 2)': '2015-03-28 01:00:00',
    'HW 6 (Project 3)': '2015-04-09 01:00:00',
    'HW 7': '2015-04-23 01:00:00',
    'HW 8 (Project 4)': '2015-05-03 01:00:00'
  }
  
  for (var i = startRow; i <= endRow; i++) {
    current_row = ss.getRange(i, 1, 1, 7);
    lastColumn = 7;
    
    hw_num = current_row.getValues()[0][4];
    email = current_row.getValues()[0][1];
    github_user = current_row.getValues()[0][3];
    sha = current_row.getValues()[0][5];
    deadline = deadlines[hw_num]
    
    all_range.getCell(i, lastColumn+1).setValue(deadline);
    
    var payload = { "github_user" : github_user, "sha" : sha };      
    var options = { "method" : "post", "payload" : payload };
    response = UrlFetchApp.fetch('http://bits.usc.edu/cs104-hooks/check.php', options);
    data = Utilities.jsonParse(response.getContentText());
    
    if (data.error) {
      all_range.getCell(i, lastColumn+2).setValue('error: ' + data.error);
      all_range.getCell(i, lastColumn+3).setValue(0);
    } else {        
      var lateDaysCount = getTimeDifference(data.time, deadlines[hw_num]);
      all_range.getCell(i, lastColumn-1).setValue(data.commit);
      all_range.getCell(i, lastColumn+2).setValue(data.time);
      all_range.getCell(i, lastColumn+3).setValue(lateDaysCount);
    }
  }
}

function postConfirmIssue(startRow, endRow) {
  var ss = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var all_range = ss.getRange(1, 1, ss.getMaxRows(), ss.getMaxColumns());
  
  for (var i = startRow; i <= endRow; i++) {
    current_row = ss.getRange(i, 1, 1, 11);
    lastColumn = 11;
    
    usc_username = current_row.getValues()[0][2];
    repo_name = 'hw_' + usc_username;
    github_user = current_row.getValues()[0][3];
    hw_num = current_row.getValues()[0][4];
    sha = current_row.getValues()[0][5];
    push_date = current_row.getValues()[0][8];
    late_days_used = current_row.getValues()[0][9];
    late_days_left = current_row.getValues()[0][10];
    
    var issueBody = 'Hi there,\n\n';
    issueBody += 'We have received your late submission request. Below are the submission details:\n\n';
    issueBody += '- **Commit SHA**: ' + sha + '\n';
    issueBody += '- **Submitted at**: ' + push_date + '\n';
    issueBody += '- **Late days used**: ' + late_days_used + '\n';
    issueBody += '- **Late days left**: ' + late_days_left + '\n\n';
    issueBody += 'This is only a receipt of your request. You will receive a Re-Submission Confirmation when I\'m done scraping your repository.\n\n'; 
    issueBody += 'Please close this issue after confirming the information in it is correct. If there is anything wrong, mention `@peetahzee` in a comment.';

    var result = createGithubIssue(repo_name, 'Late Submission Request Success for ' + hw_num, issueBody, github_user);
    
    // set status
    all_range.getCell(i, lastColumn+1).setValue('Confirmed');
    
    // set CSV
    all_range.getCell(i, lastColumn+2).setValue(github_user + ',' + repo_name + ',' + sha);
  }
}

function postInvalidIssue(title, message, startRow, endRow) {
  var ss = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var all_range = ss.getRange(1, 1, ss.getMaxRows(), ss.getMaxColumns());
  
  for (var i = startRow; i <= endRow; i++) {
    current_row = ss.getRange(i, 1, 1, 11);
    lastColumn = 11;
    
    usc_username = current_row.getValues()[0][2];
    repo_name = 'hw_' + usc_username;
    github_user = current_row.getValues()[0][3];
    hw_num = current_row.getValues()[0][4];
    sha = current_row.getValues()[0][5];
    push_date = current_row.getValues()[0][8];
    
    var issueBody = 'Hi there,\n\n';
    issueBody += 'We have received your late submission request, but we cannot accept it.\n\n';    
    issueBody += '**' + message + '**\n\n';
    issueBody += 'Below are the request details:\n\n';
    issueBody += '- **Commit SHA**: ' + sha + '\n';
    if (push_date.toString().indexOf('error') == -1) {
      issueBody += '- **Submitted at**: ' + push_date + '\n\n';
    } else {
      issueBody += '\n';
    }
    issueBody += 'If you know how to fix the error, submit the [Late Submission Form](http://bit.ly/cs104late) again. If not, mention `@peetahzee` in a comment for additional details.'; 

    var result = createGithubIssue(repo_name, 'Late Submission Request Failure for ' + hw_num + ' - ' + title, issueBody, github_user);
    
    // set status
    all_range.getCell(i, lastColumn+1).setValue('Error: ' + title);
  }
}

function sendFailureEmails(startRow, endRow) {
  var issueBody = 'Hi there,';
  issueBody += 'We have received your late submission request, but we are unable to process it';
  var result = createGithubIssue('admin', 'Late Submission Request Failure', 'ignore this isssue\n\nPeter', 'peetahzee');
}

function createGithubIssue(repo, title, body, assignee) {
  var accessToken = "d7901bab600139f31f8fa0413e508cb7896a55b5"; // SUPER SECRET
  var payload = {
    "title": title,
    "body": body,
    "assignee": assignee
  };      
  var options = {
    "method": "post",
    "payload": JSON.stringify(payload),
    "headers": {"Authorization": "Basic " + Utilities.base64Encode(accessToken + ":" + "x-oauth-basic")}
  };
  return UrlFetchApp.fetch('https://api.github.com/repos/usc-csci104-spring2015/' + repo + '/issues', options);
}

function parseDate(dateString) {
  var regex = /(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/;
  var d = regex.exec(dateString);
  return new Date(d[1], d[2], d[3], d[4], d[5], d[6]);
}

function getTimeDifference(time1, time2) {
  var msInDay = 60*60*24*1000;
  return Math.ceil((parseDate(time1).getTime() - parseDate(time2).getTime()) / msInDay);
}
