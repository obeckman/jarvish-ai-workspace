export const myExpensiveFunction = (arr: number[]) => {

    return arr.reduce((item, acc) => acc += item, 0)

}