package com.finnest;

import com.finnest.budget.SpendingGroup;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.assertj.core.api.Assertions.assertThat;

/** Sprint 9: the seven Money Out groups. Same cases as the frontend's simpleMoney.test.ts — keep the two in step. */
class SpendingGroupTest {

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
            "Rent|Home & bills", "Utilities|Home & bills", "Bills|Home & bills", "Electricity|Home & bills",
            "Food|Food & daily needs", "Groceries|Food & daily needs", "Daily Life|Food & daily needs",
            "Travel|Transport & travel", "Fuel|Transport & travel",
            "Medical|Health & insurance", "Insurance premium|Health & insurance",
            "Education|Education & children", "School fees|Education & children",
            "Entertainment|Shopping & fun", "Shopping|Shopping & fun",
            "Gifts|Family & giving", "Donation|Family & giving", "Money to parents|Family & giving",
            "Home & bills|Home & bills", "food & daily needs|Food & daily needs",
    })
    void oldCategoriesGoToOneGroup(String category, String group) {
        assertThat(SpendingGroup.of(category)).isEqualTo(group);
    }

    @Test
    void unknownIsNotSortedRatherThanGuessed() {
        assertThat(SpendingGroup.of("Misc")).isEqualTo(SpendingGroup.NOT_SORTED);
        assertThat(SpendingGroup.of("")).isEqualTo(SpendingGroup.NOT_SORTED);
        assertThat(SpendingGroup.of(null)).isEqualTo(SpendingGroup.NOT_SORTED);
        assertThat(SpendingGroup.of("Investments")).isEqualTo(SpendingGroup.NOT_SORTED); // investing is not spending
        assertThat(SpendingGroup.NAMES).hasSize(7);
    }
}
