Feature: url stability for mobile and desktop client
  As a user
  I want to work on different docs, sheets, slides etc.., using Collabora online office
  To make sure that the file can be opened from the mobile and desktop client
  # To run this feature we need to run the external app-provider service along with wopi, Collabora services
  # This is a minimal test for the integration of OpenCloud with Collabora online office
  # Check that the file can be opened in collabora using the url.


  Scenario: open office suite files with Collabora
    Given "Admin" creates following users using API
      | id    |
      | Alice |
    And "Alice" logs in
    And "Alice" creates the following files into personal space using API
      | pathToFile       | content              |
      | OpenDocument.odt | OpenDocument Content |

    # desktop feature
    When "Alice" opens the file "OpenDocument.odt" of space "personal" in Collabora through the URL for desktop client
    Then "Alice" should see the content "OpenDocument Content" in editor "Collabora"
   
    # mobile feature
    When "Alice" opens the file "OpenDocument.odt" of space "personal" in Collabora through the URL for mobile client
    Then "Alice" should see the content "OpenDocument Content" in editor "Collabora"
    And "Alice" logs out
