Feature: Sort resources
  As a user
  I want to sort the files list
  So that I can quickly find the resources I am looking for

  Background:
    Given "Admin" creates following user using API
      | id    |
      | Alice |


  Scenario: sort resources by name, size and modified date with and without folders first
    Given "Alice" creates the following folders in personal space using API
      | name |
      | beta |
      | Zulu |
    And "Alice" creates the following files with mtime into personal space using API
      | pathToFile | content                                  | mtimeDeltaDays |
      | item1.txt  | medium sized content                     | -29 days       |
      | Item2.txt  | small                                    |                |
      | item10.txt | this content is the longest of all files | -5 days        |
    And "Alice" logs in
    And "Alice" opens the "files" app
    When "Alice" switches to the "table" view

    # name
    And "Alice" sorts the files list by "Name" desc
    Then "Alice" should see the resources in the files list in the following order
      | resource   |
      | Zulu       |
      | beta       |
      | item10.txt |
      | Item2.txt  |
      | item1.txt  |
    When "Alice" sorts the files list by "Name" asc
    Then "Alice" should see the resources in the files list in the following order
      | resource   |
      | beta       |
      | Zulu       |
      | item1.txt  |
      | Item2.txt  |
      | item10.txt |

    # size: both folders are empty, so only one of them is checked
    When "Alice" sorts the files list by "Size" desc
    Then "Alice" should see the resources in the files list in the following order
      | resource   |
      | beta       |
      | item10.txt |
      | item1.txt  |
      | Item2.txt  |
    When "Alice" sorts the files list by "Size" asc
    Then "Alice" should see the resources in the files list in the following order
      | resource   |
      | beta       |
      | Item2.txt  |
      | item1.txt  |
      | item10.txt |

    # modified: both folders are created right now, so only one of them is checked
    When "Alice" sorts the files list by "Modified" desc
    Then "Alice" should see the resources in the files list in the following order
      | resource   |
      | beta       |
      | Item2.txt  |
      | item10.txt |
      | item1.txt  |
    When "Alice" sorts the files list by "Modified" asc
    Then "Alice" should see the resources in the files list in the following order
      | resource   |
      | beta       |
      | item1.txt  |
      | item10.txt |
      | Item2.txt  |

    # folders first
    When "Alice" disables the option to sort folders first
    Then "Alice" should see the resources in the files list in the following order
      | resource   |
      | item1.txt  |
      | item10.txt |
      | beta       |
    When "Alice" sorts the files list by "Size" desc
    Then "Alice" should see the resources in the files list in the following order
      | resource   |
      | item10.txt |
      | item1.txt  |
      | Item2.txt  |
      | beta       |
    When "Alice" sorts the files list by "Name" asc
    Then "Alice" should see the resources in the files list in the following order
      | resource   |
      | beta       |
      | item1.txt  |
      | Item2.txt  |
      | item10.txt |
      | Zulu       |
    When "Alice" enables the option to sort folders first
    Then "Alice" should see the resources in the files list in the following order
      | resource   |
      | beta       |
      | Zulu       |
      | item1.txt  |
      | Item2.txt  |
      | item10.txt |
    And "Alice" logs out


  Scenario: sorting is kept in a new tab and after logging in again
    Given "Alice" creates the following folders in personal space using API
      | name |
      | beta |
      | Zulu |
    And "Alice" creates the following files into personal space using API
      | pathToFile | content                                  |
      | item1.txt  | medium sized content                     |
      | Item2.txt  | small                                    |
      | item10.txt | this content is the longest of all files |
    And "Alice" logs in
    And "Alice" opens the "files" app
    When "Alice" switches to the "table" view
    And "Alice" sorts the files list by "Size" desc
    And "Alice" disables the option to sort folders first
    Then "Alice" should see the resources in the files list in the following order
      | resource   |
      | item10.txt |
      | item1.txt  |
      | Item2.txt  |
      | beta       |
    When "Alice" opens a new tab
    And "Alice" opens the "files" app
    Then "Alice" sees the resources displayed as "table"
    And "Alice" should see the resources in the files list in the following order
      | resource   |
      | item10.txt |
      | item1.txt  |
      | Item2.txt  |
      | beta       |
    When "Alice" logs out and logs in again in the same browser
    And "Alice" opens the "files" app
    Then "Alice" should see the resources in the files list in the following order
      | resource   |
      | item10.txt |
      | item1.txt  |
      | Item2.txt  |
      | beta       |
    And "Alice" logs out


  Scenario: sort resources by name naturally
    Given "Alice" creates the following files into personal space using API
      | pathToFile | content |
      | file10.txt | file    |
      | File2.txt  | file    |
      | file1.txt  | file    |
      | éclair.txt | file    |
      | eclair.txt | file    |
      | 0_a.txt    | file    |
      | 00_b.txt   | file    |
      | a.txt      | file    |
      | a.md       | file    |
      | a b.txt    | file    |
      | 文件.txt   | file    |
    And "Alice" logs in
    And "Alice" opens the "files" app
    When "Alice" switches to the "table" view
    # leading zeros sort like in Windows: more zeros come first,
    # resources with the same base name are sorted by their extension
    Then "Alice" should see the resources in the files list in the following order
      | resource   |
      | 00_b.txt   |
      | 0_a.txt    |
      | a.md       |
      | a.txt      |
      | a b.txt    |
      | eclair.txt |
      | éclair.txt |
      | file1.txt  |
      | File2.txt  |
      | file10.txt |
      | 文件.txt   |
    When "Alice" sorts the files list by "Name" desc
    Then "Alice" should see the resources in the files list in the following order
      | resource   |
      | 文件.txt   |
      | file10.txt |
      | File2.txt  |
      | file1.txt  |
      | éclair.txt |
      | eclair.txt |
      | a b.txt    |
      | a.txt      |
      | a.md       |
      | 0_a.txt    |
      | 00_b.txt   |
    And "Alice" logs out
