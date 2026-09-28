Feature: Search in the project space

  Scenario: Search in the project spaces
    Given "Admin" creates following user using API
      | id    |
      | Alice |
    And "Admin" assigns following role to the users using API
      | id    | role        |
      | Alice | Space Admin |
    And "Alice" logs in
    And "Alice" creates the project space using API "team"
    And "Alice" navigates to the project space "team"
    And "Alice" creates the following resource
      | resource                   | type   |
      | folder(WithSymbols:!;_+-&) | folder |
    And "Alice" uploads the following resource
      | resource               | to                         |
      | new-'single'quotes.txt | folder(WithSymbols:!;_+-&) |
    And "Alice" navigates to the personal space page

    # search for project space objects
    When "Alice" searches "-'s" using the global search and the "all files" filter
    Then following resource should be displayed in the search list for user "Alice"
      | resource                                          |
      | folder(WithSymbols:!;_+-&)/new-'single'quotes.txt |
    But following resource should not be displayed in the search list for user "Alice"
      | resource                   |
      | folder(WithSymbols:!;_+-&) |
    When "Alice" searches "!;_+-&)" using the global search and the "all files" filter
    Then following resource should be displayed in the search list for user "Alice"
      | resource                   |
      | folder(WithSymbols:!;_+-&) |
    But following resource should not be displayed in the search list for user "Alice"
      | resource                                          |
      | folder(WithSymbols:!;_+-&)/new-'single'quotes.txt |
    And "Alice" logs out
