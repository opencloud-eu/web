Feature: Delete
  As a user
  I want to delete a file or folder


  Background:
    Given "Admin" creates following user using API
      | id    |
      | Alice |
      | Brian |


  Scenario: delete file from insinde an app
    And "Alice" creates the following files into personal space using API
      | pathToFile       | content     |
      | new file.txt     | lorem ipsum |
      | new testfile.txt | lorem ipsum |
    When "Alice" logs in
    And "Alice" opens the following file in texteditor
      | resource     |
      | new file.txt |
    When "Alice" deletes the resource using the app topbar
    Then following resources should not be displayed in the files list for user "Alice"
      | resource     |
      | new file.txt |
    And following resources should be displayed in the files list for user "Alice"
      | resource         |
      | new testfile.txt |
    And "Alice" logs out

  Scenario: delete files from insinde the mediaviewer app
    And "Alice" uploads the following local file into personal space using API
      | localFile      | to             |
      | testavatar.jpg | testavatar.jpg |
      | testavatar.png | testavatar.png |
      | sampleGif.gif  | sampleGif.gif  |
      | textfile.txt   | textfile.txt   |
    When "Alice" logs in
    And "Alice" opens the following file in mediaviewer
      | resource      |
      | sampleGif.gif |
    Then "Alice" should see resource "1" of "3" in the mediaviewer controls
    When "Alice" deletes the resource using the app topbar
    Then "Alice" should see resource "1" of "2" in the mediaviewer controls
    When "Alice" deletes the resource using the app topbar
    Then "Alice" should see resource "1" of "1" in the mediaviewer controls
    When "Alice" deletes the resource using the app topbar
    Then following resources should not be displayed in the files list for user "Alice"
      | resource       |
      | testavatar.jpg |
      | testavatar.png |
      | sampleGif.gif  |
    And following resources should be displayed in the files list for user "Alice"
      | resource         |
      | textfile.txt |
    And "Alice" logs out
