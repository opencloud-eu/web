Feature: rename
  As a user
  I want to save current resource as a new resource
  So I can have a copy of the resource

  Scenario: save as resources in personal space
    Given "Admin" creates following users using API
      | id    |
      | Alice |
    And "Admin" assigns following role to the users using API
      | id    | role        |
      | Alice | Space Admin |
    And "Alice" creates the following project spaces using API
      | name       |
      | cool-space |
    And "Alice" creates the following folders in personal space using API
      | name       |
      | top-folder |
    And "Alice" creates the following files into personal space using API
      | pathToFile   | content     |
      | textfile.txt | lorem ipsum |
    When "Alice" logs in
    And "Alice" opens the following file in texteditor
      | resource     |
      | textfile.txt |
    Then "Alice" should see the content "lorem ipsum" in editor "TextEditor"
    And "Alice" enters the text "lorem ipsum update" in editor "TextEditor"
    And "Alice" saves the file viewer
    When "Alice" saves the current file as "textfile.txt"
    Then file "textfile (1).txt" should be opened in texteditor for user "Alice"
    And "Alice" should see the content "lorem ipsum update" in editor "TextEditor"
    When "Alice" switches to tab 1
    And "Alice" closes the file viewer
    Then following resources should be displayed in the files list for user "Alice"
      | resource         |
      | textfile.txt     |
      | textfile (1).txt |
    And "Alice" closes the current tab
    And "Alice" closes the file viewer
    And "Alice" opens the following file in texteditor
      | resource     |
      | textfile.txt |
    When "Alice" saves the current file as "top-folder/newfile.txt"
    Then file "newfile.txt" should be opened in texteditor for user "Alice"
    And "Alice" should see the content "lorem ipsum update" in editor "TextEditor"
    When "Alice" closes the file viewer
    Then following resources should be displayed in the files list for user "Alice"
      | resource    |
      | newfile.txt |
    When "Alice" opens the following file in texteditor
      | resource    |
      | newfile.txt |
    And "Alice" saves the current file as "Project/cool-space/newfile.txt"
    Then file "newfile.txt" should be opened in texteditor for user "Alice"
    And "Alice" closes the current tab
    And "Alice" closes the file viewer
    When "Alice" navigates to the project space "cool-space"
    Then following resources should be displayed in the files list for user "Alice"
      | resource    |
      | newfile.txt |
    And "Alice" logs out


  Scenario: save as resources in project space
    Given "Admin" creates following users using API
      | id    |
      | Alice |
    And "Admin" assigns following role to the users using API
      | id    | role        |
      | Alice | Space Admin |
    And "Alice" creates the following project spaces using API
      | name       |
      | cool-space |
    And "Alice" creates the following folders in space "cool-space" using API
      | name       |
      | top-folder |
    And "Alice" creates the following files in space "cool-space" using API
      | name         | content     |
      | textfile.txt | lorem ipsum |
    When "Alice" logs in
    And "Alice" navigates to the project space "cool-space"
    And "Alice" opens the following file in texteditor
      | resource     |
      | textfile.txt |
    Then "Alice" should see the content "lorem ipsum" in editor "TextEditor"
    When "Alice" saves the current file as "textfile.txt"
    Then file "textfile (1).txt" should be opened in texteditor for user "Alice"
    And "Alice" should see the content "lorem ipsum" in editor "TextEditor"
    When "Alice" switches to tab 1
    And "Alice" closes the file viewer
    Then following resources should be displayed in the files list for user "Alice"
      | resource         |
      | textfile.txt     |
      | textfile (1).txt |
    And "Alice" closes the current tab
    And "Alice" closes the file viewer
    And "Alice" opens the following file in texteditor
      | resource     |
      | textfile.txt |
    When "Alice" saves the current file as "top-folder/newfile.txt"
    Then file "newfile.txt" should be opened in texteditor for user "Alice"
    And "Alice" should see the content "lorem ipsum" in editor "TextEditor"
    When "Alice" closes the file viewer
    Then following resources should be displayed in the files list for user "Alice"
      | resource    |
      | newfile.txt |
    When "Alice" opens the following file in texteditor
      | resource    |
      | newfile.txt |
    And "Alice" saves the current file as "Personal/fromspacefile.txt"
    Then file "fromspacefile.txt" should be opened in texteditor for user "Alice"
    And "Alice" closes the current tab
    And "Alice" closes the file viewer
    When "Alice" navigates to the personal space page
    Then following resources should be displayed in the files list for user "Alice"
      | resource          |
      | fromspacefile.txt |
    And "Alice" logs out
