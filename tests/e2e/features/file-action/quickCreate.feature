Feature: quick-create
  As a user
  I want to create files with a single click above the file list
  So that I can start working on new documents quickly

  Scenario: create files using the quick-create bar
    Given "Admin" creates following users using API
      | id    |
      | Alice |
    And "Alice" creates the following folder in personal space using API
      | name   |
      | folder |
    And "Alice" logs in
    When "Alice" creates the following resources using the quick-create bar
      | resource             | type     | content        |
      | quick.ocnote         | noteFile | quick content  |
      | folder/nested.ocnote | noteFile | nested content |
    And "Alice" opens the following file in texteditor
      | resource     |
      | quick.ocnote |
    Then "Alice" should see the text "quick content" in the text-editor
    And "Alice" closes the file viewer
    When "Alice" opens folder "folder"
    And "Alice" opens the following file in texteditor
      | resource      |
      | nested.ocnote |
    Then "Alice" should see the text "nested content" in the text-editor
    And "Alice" closes the file viewer
    And "Alice" logs out
