Feature: url stability for mobile and desktop client
  As a user
  I want to work on different docs, sheets, slides etc.., using OnlyOffice online office
  To make sure that the file can be opened from the mobile and desktop client
  # To run this feature we need to run the external app-provider service along with wopi, OnlyOffice services
  # This is a minimal test for the integration of OpenCloud with OnlyOffice online office
  # Check that the file can be opened in the onlyoffice online office using the url.


  Scenario: open office suite files with onlyOffice
    Given "Admin" creates following users using API
      | id    |
      | Alice |
    And "Alice" logs in
    And "Alice" creates the following resources
      | resource           | type           | content                |
      | MicrosoftWord.docx | Microsoft Word | Microsoft Word Content |
    And for "Alice" file "MicrosoftWord.docx" should not be locked
    And "Alice" opens the "files" app

    # desktop feature
    When "Alice" opens the file "MicrosoftWord.docx" of space "personal" in OnlyOffice through the URL for desktop client
    Then "Alice" should see the content "Microsoft Word Content" in editor "OnlyOffice"

    # mobile feature
    When "Alice" opens the file "MicrosoftWord.docx" of space "personal" in OnlyOffice through the URL for mobile client
    Then "Alice" should see the content "Microsoft Word Content" in editor "OnlyOffice"
    And "Alice" logs out
