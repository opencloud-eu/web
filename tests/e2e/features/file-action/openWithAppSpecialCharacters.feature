Feature: open files with special characters in apps
  As a user
  I want to open files whose name or parent folder contains special characters
  So that I can work with resources regardless of the characters in their path
        

  Scenario: open a file inside a folder containing a hash character in the text-editor
    Given "Admin" creates following user using API
      | id    |
      | Alice |
    And "Alice" creates the following folder in personal space using API
      | name        |
      | ticket#3074 |
    And "Alice" creates the following file into personal space using API
      | pathToFile               | content      |
      | ticket#3074/example?.txt | example text |
      | ticket#3074/test%20.txt  | some content |
    And "Alice" uploads the following local file into personal space using API
      | localFile      | to                       |
      | testavatar.png | ticket#3074/image%20.png |
    And "Alice" logs in
    When "Alice" opens the "files" app
    And "Alice" opens folder "ticket#3074"
    When "Alice" opens the following file in texteditor
      | resource     | verifyPropfindPath |
      | example?.txt | true               |
    Then "Alice" is in a text-editor
    And "Alice" should see the content "example text" in editor "TextEditor"
    And "Alice" closes the file viewer
    When "Alice" opens the following file in texteditor
      | resource    | verifyPropfindPath |
      | test%20.txt | true               |
    Then "Alice" should see the content "some content" in editor "TextEditor"
    And "Alice" closes the file viewer
    When "Alice" opens the following file in mediaviewer
      | resource     | verifyPropfindPath |
      | image%20.png | true               |
    Then "Alice" is in a media-viewer
    And "Alice" downloads the following resource using the preview topbar
      | resource     | type |
      | image%20.png | file |
    And "Alice" closes the file viewer
    And "Alice" logs out
