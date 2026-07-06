Feature: url stability for mobile and desktop client
  As a user
  I want to work on different docs, sheets, slides etc.., using Euro-Office online office
  To make sure that the file can be opened from the mobile and desktop client


  Scenario: open office suite files with Euro-Office
    Given "Admin" creates following user using API
      | id    |
      | Alice |
    And "Alice" logs in
    And "Alice" creates the following resource
      | resource           | type           | content                |
      | MicrosoftWord.docx | Microsoft Word | Microsoft Word Content |
    And for "Alice" file "MicrosoftWord.docx" should not be locked
    And "Alice" opens the "files" app

    # desktop feature
    When "Alice" opens the file "MicrosoftWord.docx" of space "personal" in Euro-Office through the URL for desktop client
    Then "Alice" should see the content "Microsoft Word Content" in editor "Euro-Office"

    # mobile feature
    When "Alice" opens the file "MicrosoftWord.docx" of space "personal" in Euro-Office through the URL for mobile client
    Then "Alice" should see the content "Microsoft Word Content" in editor "Euro-Office"
    And "Alice" logs out
