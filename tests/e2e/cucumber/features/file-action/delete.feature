Feature: Delete
  As a user
  I want to delete a file or folder


  Background:
    Given "Admin" creates following user using API
      | id    |
      | Alice |
      | Brian |


  Scenario: delete file from inside an app
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

  Scenario: delete files from inside the mediaviewer app
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

  
  Scenario: quick restore deleted files
    Given "Admin" assigns following roles to the users using API
      | id    | role        |
      | Alice | Space Admin |
    And "Alice" creates the following folder in personal space using API
      | name      |
      | my-folder |
    And "Alice" uploads the following local file into personal space using API
      | localFile      | to                   |
      | testavatar.jpg | testavatar.jpg       |
      | simple.pdf     | my-folder/simple.pdf |
    And "Alice" creates the following project spaces using API
      | name    | id      |
      | mySpace | mySpace |
    And "Alice" creates the following folder in space "mySpace" using API
      | name        |
      | spaceFolder |
    And "Alice" creates the following file in space "mySpace" using API
      | name          | content      |
      | spaceFile.txt | test content |
    
    When "Alice" logs in
    And "Alice" deletes and immediately undoes the following resource using "undo button"
      | resource       |
      | testavatar.jpg |
    And "Alice" deletes and immediately undoes the following resources using "keyboard"
      | resource       |
      | testavatar.jpg |
      | my-folder      |
    And following resources should be displayed in the files list for user "Alice"
      | resource       |
      | testavatar.jpg |
      | my-folder      |

    And "Alice" navigates to the project space "mySpace"
    And "Alice" deletes and immediately undoes the following resources using "undo button"
      | resource       |
      | spaceFile.txt  |
      | spaceFolder    |

    And "Alice" deletes and immediately undoes the following resources using "keyboard"
      | resource      |
      | spaceFile.txt |
      | spaceFolder   |
    And following resources should be displayed in the files list for user "Alice"
      | resource       |
      | spaceFile.txt  |
      | spaceFolder    |
    And "Alice" logs out
