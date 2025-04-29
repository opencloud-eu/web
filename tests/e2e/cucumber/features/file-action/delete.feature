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
    And "Alice" logs out
