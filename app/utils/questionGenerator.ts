/**
 * A generic class to generate a pseudo-random sequence of items from a list of options.
 * It uses a weighted random sampling algorithm to make it more likely to select
 * items that have been selected less frequently, ensuring variety over time.
 */
export class QuestionGenerator<T> {
  private availableOptions: T[];
  private selectionCounts: Map<T, number>;

  /**
   * @param options The initial set of options.
   */
  constructor(options: T[]) {
    this.availableOptions = [];
    this.selectionCounts = new Map();
    this.updateOptions(options);
  }

  /**
   * Gets the next item from the sequence using a weighted random algorithm.
   * Items that have been selected fewer times are more likely to be chosen.
   * @returns The next item.
   */
  public getNext(): T {
    if (this.availableOptions.length === 0) {
      throw new Error("No options available to choose from.");
    }

    // Find the maximum selection count among the available options.
    let maxCount = 0;
    for (const option of this.availableOptions) {
      const count = this.selectionCounts.get(option) || 0;
      if (count > maxCount) {
        maxCount = count;
      }
    }

    // Calculate weights and total weight.
    // The weight is inversely proportional to the selection count.
    const weights = new Map<T, number>();
    let totalWeight = 0;
    for (const option of this.availableOptions) {
      const count = this.selectionCounts.get(option) || 0;
      const weight = maxCount - count + 1; // Add 1 to ensure every item has a weight of at least 1.
      weights.set(option, weight);
      totalWeight += weight;
    }

    // Pick a random number and find the corresponding item.
    let randomNum = Math.random() * totalWeight;
    for (const option of this.availableOptions) {
      const weight = weights.get(option)!;
      randomNum -= weight;
      if (randomNum <= 0) {
        // Increment the count for the selected option and return it.
        const currentCount = this.selectionCounts.get(option) || 0;
        this.selectionCounts.set(option, currentCount + 1);
        return option;
      }
    }

    // Fallback for the highly unlikely case of floating point errors.
    const lastOption = this.availableOptions[this.availableOptions.length - 1];
    const currentCount = this.selectionCounts.get(lastOption) || 0;
    this.selectionCounts.set(lastOption, currentCount + 1);
    return lastOption;
  }

  /**
   * Updates the set of available options.
   * This resets the selection counts, as the context of the quiz has changed.
   * @param newOptions The new set of options.
   */
  public updateOptions(newOptions: T[]) {
    this.availableOptions = [...newOptions];

    this.selectionCounts.clear();
    for (const option of this.availableOptions) {
      this.selectionCounts.set(option, 0);
    }
  }
}
