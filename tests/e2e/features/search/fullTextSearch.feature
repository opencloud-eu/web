Feature: Search
  As a user
  I want to do full text search
  So that I can find the files with the content I am looking for

  Scenario: search for content of file
    Given "Admin" creates following users using API
      | id    |
      | Alice |
      | Brian |
    And "Admin" assigns following role to the users using API
      | id    | role        |
      | Brian | Space Admin |
    And "Alice" uploads the following local file into personal space using API
      | localFile    | to              |
      | textfile.txt | fileToShare.txt |
    And "Alice" adds the following tag for the following resource using API
      | resource        | tags      |
      | fileToShare.txt | alice tag |
    And "Alice" shares the following resource using API
      | resource        | recipient | type | role     |
      | fileToShare.txt | Brian     | user | Can edit |
    And "Brian" creates the following folder in personal space using API
      | name       |
      | testFolder |
    And "Brian" uploads the following local file into personal space using API
      | localFile    | to                           |
      | textfile.txt | textfile.txt                 |
      | textfile.txt | fileWithTag.txt              |
      | textfile.txt | withTag.txt                  |
      | textfile.txt | testFolder/innerTextfile.txt |
    And "Brian" creates the project space using API "FullTextSearch"
    And "Brian" creates the following folder in space "FullTextSearch" using API
      | name        |
      | spaceFolder |
    And "Brian" creates the following file in space "FullTextSearch" using API
      | name                          | content                   |
      | spaceFolder/spaceTextfile.txt | This is test file. Cheers |
    And "Brian" adds the following tags for the following resources using API
      | resource        | tags  |
      | fileWithTag.txt | tag 1 |
      | withTag.txt     | tag 1 |
    And "Brian" logs in
    When "Brian" searches "" using the global search and the "all files" filter and presses enter
    Then "Brian" should see the message "Search for files" on the search result

    When "Brian" selects tag "alice tag" from the search result filter chip
    Then following resource should be displayed in the files list for user "Brian"
      | resource        |
      | fileToShare.txt |

    When "Brian" clears tags filter
    And "Brian" selects tag "tag 1" from the search result filter chip
    Then following resources should be displayed in the files list for user "Brian"
      | resource        |
      | fileWithTag.txt |
      | withTag.txt     |

    When "Brian" searches "file" using the global search and the "all files" filter and presses enter
    Then following resource should be displayed in the files list for user "Brian"
      | resource        |
      | fileWithTag.txt |

    When "Brian" clears tags filter
    Then following resources should be displayed in the files list for user "Brian"
      | resource                      |
      | textfile.txt                  |
      | fileWithTag.txt               |
      | testFolder/innerTextfile.txt  |
      | fileToShare.txt               |
      | spaceFolder/spaceTextfile.txt |

    When "Brian" searches "Cheers" using the global search and the "all files" filter and presses enter
    Then following resources should be displayed in the files list for user "Brian"
      | resource                      |
      | textfile.txt                  |
      | testFolder/innerTextfile.txt  |
      | fileToShare.txt               |
      | fileWithTag.txt               |
      | withTag.txt                   |
      | spaceFolder/spaceTextfile.txt |
    When "Brian" opens the following file in texteditor
      | resource     |
      | textfile.txt |
    And "Brian" closes the file viewer
    Then following resources should be displayed in the files list for user "Brian"
      | resource                      |
      | textfile.txt                  |
      | testFolder/innerTextfile.txt  |
      | fileToShare.txt               |
      | fileWithTag.txt               |
      | withTag.txt                   |
      | spaceFolder/spaceTextfile.txt |
    And "Brian" logs out


  Scenario: search shows why a resource was found
    Given "Admin" creates following user using API
      | id    |
      | Alice |
    And "Alice" creates the following files into personal space using API
      | pathToFile      | content                                                                                                                                                 |
      | offer.txt       | This long introduction is far wider than a single tile and mentions many other things before it finally talks about Apollo and its roadmap in detail. |
      | notes.txt       | meeting notes                                                                                                                                           |
      | apollo-plan.txt | plan                                                                                                                                                    |
    And "Alice" adds the following tag for the following resource using API
      | resource  | tags   |
      | notes.txt | Apollo |
    And "Alice" logs in

    # search preview
    When "Alice" searches "apollo" using the global search and the "all files" filter
    Then following resources should be displayed in the search list for user "Alice"
      | resource        |
      | offer.txt       |
      | notes.txt       |
      | apollo-plan.txt |
    And the following found content should be displayed in the search preview for user "Alice"
      | resource  | match  |
      | offer.txt | Apollo |
    And the following matching tags should be displayed in the search preview for user "Alice"
      | resource  | tags   |
      | notes.txt | Apollo |
    And no found content or matching tags should be displayed for the following resource in the search preview for user "Alice"
      | resource        |
      | apollo-plan.txt |

    # search results
    When "Alice" searches "apollo" using the global search and the "all files" filter and presses enter
    Then the following found content should be displayed in the search results for user "Alice"
      | resource  | match  |
      | offer.txt | Apollo |
    And the following matching tags should be displayed in the search results for user "Alice"
      | resource  | tags   |
      | notes.txt | Apollo |
    And no found content or matching tags should be displayed for the following resource in the search results for user "Alice"
      | resource        |
      | apollo-plan.txt |

    # the found content is cut off to one line in small tiles, the match must stay visible
    When "Alice" switches to the "tiles" view
    And "Alice" reduces the tile size
    Then the following found content should be displayed in the search results for user "Alice"
      | resource  | match  |
      | offer.txt | Apollo |

    # tags selected in the tag filter are shown as matching tags
    When "Alice" searches "" using the global search and the "all files" filter and presses enter
    And "Alice" selects tag "Apollo" from the search result filter chip
    Then the following matching tags should be displayed in the search results for user "Alice"
      | resource  | tags   |
      | notes.txt | Apollo |
    And "Alice" logs out
