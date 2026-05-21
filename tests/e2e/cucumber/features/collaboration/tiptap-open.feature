Feature: Open a Markdown file in Tiptap
  As a user
  I want to open .md files in Tiptap
  So that I can edit them as rich text with realtime collaboration

  Background:
    Given "Admin" creates following user using API
      | id    |
      | Alice |


  Scenario: Markdown content is rendered as rich text
    And "Alice" creates the following files into personal space using API
      | pathToFile   | content                                                                                                       |
      | rich-note.md | # Rich Note\n\n## Section Two\n\nThis is **bold** and this is *italic* and `inline code`.\n\n- one\n- two\n- three\n\n1. first\n2. second |
    When "Alice" logs in
    And "Alice" opens file "rich-note.md" via "tiptap" using the context menu
    Then "Alice" should see the realtime collab status "connected"
    And "Alice" should see content "Rich Note" in the "tiptap" editor
    And "Alice" should see content "Section Two" in the "tiptap" editor
    And "Alice" should see content "bold" in the "tiptap" editor
    And "Alice" should see content "italic" in the "tiptap" editor
    And "Alice" should see content "inline code" in the "tiptap" editor
    And "Alice" logs out
