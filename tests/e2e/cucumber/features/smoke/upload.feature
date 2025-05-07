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

    # upload empty folder
    When "Alice" uploads the following resources
      | resource | type   |
      | FOLDER   | folder |
    Then following resources should be displayed in the files list for user "Alice"
      | resource |
      | FOLDER   |
    
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
