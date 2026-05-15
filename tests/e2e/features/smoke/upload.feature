Feature: Upload
  As a user
  I want to upload resources
  So that I can store them in OpenCloud

  Background:
    Given "Admin" creates following user using API
      | id    |
      | Alice |
    And "Alice" logs in
    And "Alice" opens the "files" app


  Scenario: Upload files in personal space
    Given "Alice" creates the following resources
      | resource          | type    | content             |
      | new-lorem-big.txt | txtFile | new lorem big file  |
      | lorem.txt         | txtFile | lorem file          |
      | textfile.txt      | txtFile | some random content |
      | comma,.txt        | txtFile | comma               |
      | test#file.txt     | txtFile | some content        |
      | test#folder       | folder  |                     |
    When "Alice" uploads the following resources
      | resource          | option    |
      | new-lorem-big.txt | replace   |
      | lorem.txt         | skip      |
      | textfile.txt      | keep both |
    And "Alice" creates the following resources
      | resource           | type    | content      |
      | PARENT             | folder  |              |
      | PARENT/parent.txt  | txtFile | some text    |
      | PARENT/example.txt | txtFile | example text |
    And "Alice" uploads the following resources via drag-n-drop
      | resource       |
      | simple.pdf     |
      | testavatar.jpg |
    And "Alice" downloads the following resources using the sidebar panel
      | resource      | type   |
      | PARENT        | folder |
      | comma,.txt    | file   |
      | test#file.txt | file   |
      | test#folder   | folder |
    And "Alice" logs out


  Scenario: upload multiple small files
    When "Alice" uploads 50 small files in personal space
    Then "Alice" should see 50 resources in the personal space files view
    And "Alice" logs out


  Scenario: upload folder
    When "Alice" uploads the following resources
      | resource | type   |
      | PARENT   | folder |
    # check that folder content exist
    And "Alice" opens folder "PARENT"
    And "Alice" opens the following file in pdfviewer
      | resource   |
      | simple.pdf |
    And "Alice" closes the file viewer
    
    # folder upload via drag-n-drop
    When "Alice" uploads the following resources via drag-n-drop
      | resource |
      | PARENT   |
    And "Alice" opens folder "PARENT/CHILD"
    Then following resources should be displayed in the files list for user "Alice"
      | resource  |
      | child.txt |
    And "Alice" logs out


  Scenario: try to upload resources when the quota is insufficient
    Given "Admin" logs in
    And "Admin" opens the "admin-settings" app
    And "Admin" navigates to the users management page
    And "Admin" changes the quota of the user "Alice" to "0.000001" using the sidebar panel
    And "Admin" logs out

    And "Alice" opens the "files" app
    And "Alice" creates the following resources
      | resource          | type    | content             |
      | new-lorem-big.txt | txtFile | new lorem big file  |
    When "Alice" tries to upload the following resource
      | resource      | error              |
      | lorem-big.txt | Insufficient quota |
    Then following resources should not be displayed in the files list for user "Alice"
      | resource      |
      | lorem-big.txt |
    And "Alice" logs out


  Scenario: upload resource from clipboard
    When "Alice" uploads an image from the clipboard
    Then following resources should be displayed in the files list for user "Alice"
      | resource  |
      | image.png |
    And "Alice" opens the following file in mediaviewer
      | resource  |
      | image.png |
    And "Alice" closes the file viewer
    And "Alice" logs out


  Scenario: upload folder using different options
     Given "Alice" creates the following folder in personal space using API
      | name   |
      | CHILD  |
    Given "Alice" creates the following folder in personal space using API
      | name   |
      | PARENT |
    And "Alice" creates the following files into personal space using API
      | pathToFile      | content      |
      | PARENT/test.txt | some content |
    
    # keep both option
    And "Alice" uploads the following resources
      | resource  | type   | option    |
      | PARENT    | folder | keep both |
    Then following resources should be displayed in the files list for user "Alice"
      | resource   |
      | PARENT     |
      | PARENT (1) |
    And "Alice" opens folder "PARENT"
    And following resources should be displayed in the files list for user "Alice"
      | resource  |
      | test.txt  |
    And "Alice" opens the "files" app
    And "Alice" opens folder "PARENT (1)"
    And following resources should be displayed in the files list for user "Alice"
      | resource   |
      | parent.txt |
    And "Alice" opens folder "CHILD"
    And following resources should be displayed in the files list for user "Alice"
      | resource  |
      | child.txt |
    
    # replace option
    Given "Alice" creates the following files into personal space using API
      | pathToFile        | content      |
      | PARENT/parent.txt | some content |
    When "Alice" opens the "files" app
    And "Alice" uploads the following resources
      | resource  | type   | option |
      | PARENT    | folder | merge  |
    And "Alice" opens folder "PARENT"
    Then following resources should be displayed in the files list for user "Alice"
      | resource   |
      | parent.txt |
      | test.txt   |
      | CHILD      |
    # check that parent.txt content is replaced
    And "Alice" opens the following file in texteditor
      | resource   |
      | parent.txt |
    And "Alice" should see the content "OpenCloud test text file parent" in editor "TextEditor"
    And "Alice" closes the file viewer
    And "Alice" logs out
