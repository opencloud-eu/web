Feature: Mobile device test

  Scenario: create and view resources on mobile devices
    Given "Admin" creates following users using API
      | id    |
      | Alice |
      | Brian |
    And "Admin" creates following groups using API
      | id    |
      | sales |
    And "Admin" assigns following roles to the users using API
      | id    | role        |
      | Alice | Space Admin |
    
    When "Alice" logs in
    And "Alice" opens the "files" app
    And "Alice" uploads the following resources
      | resource       | type   |
      | PARENT         | folder |
      | simple.pdf     | file   |
      | testavatar.png | file   |
    And "Alice" creates the following resources
      | resource     | type         | content     |
      | myDoc.odt    | OpenDocument | my document |
      | my-folder    | folder       |             |
      | textFile.txt | txtFile      | some text   |
    When "Alice" opens the following file in pdfviewer
      | resource   |
      | simple.pdf |
    Then "Alice" is in a pdf-viewer
    And "Alice" downloads the following resources using the preview topbar
      | resource   | type |
      | simple.pdf | file |
    And "Alice" closes the file viewer
    When "Alice" opens the following file in mediaviewer
      | resource       |
      | testavatar.png |
    Then "Alice" is in a media-viewer
    And "Alice" downloads the following resources using the preview topbar
      | resource       | type |
      | testavatar.jpg | file |
    And "Alice" closes the file viewer
    And "Alice" sees the resources displayed as "tiles"
    And "Alice" switches to the "table" view
    And "Alice" sees the resources displayed as "table"
    And "Alice" logs out
