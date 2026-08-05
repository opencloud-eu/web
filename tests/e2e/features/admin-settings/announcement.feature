Feature: announcement banner
  As an admin
  I want to configure an announcement banner
  So that I can inform all users about important information

  Scenario: admin publishes an announcement banner and users see it
    Given "Admin" creates following user using API
      | id    |
      | Alice |
    And "Admin" logs in
    And "Admin" opens the "admin-settings" app
    And "Admin" navigates to the general management page
    When "Admin" saves an announcement banner with text "Scheduled maintenance tonight" and details "Our servers will be unavailable from 22:00 to 23:00."
    And "Admin" enables the announcement banner

    And "Alice" logs in
    Then "Alice" should see the announcement banner "Scheduled maintenance tonight"
    And "Alice" opens the announcement banner details
    And "Alice" should see "Our servers will be unavailable from 22:00 to 23:00." in the announcement details
    And "Alice" closes the announcement banner details
    And "Alice" dismisses the announcement banner
    And "Alice" reloads the page
    And "Alice" should see the announcement banner "Scheduled maintenance tonight"
    And "Admin" disables the announcement banner
    And "Alice" reloads the page
    And "Alice" should not see the announcement banner
    And "Alice" logs out
    And "Admin" logs out
