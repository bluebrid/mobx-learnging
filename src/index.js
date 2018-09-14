import { observable, autorun } from './.build.es6/mobx'
const addBtn = document.getElementById('add')
const minusBtn = document.getElementById('minus')
const incomeLabel = document.getElementById('incomeLabel')
const nameInput = document.getElementById('name');
const bankUser = observable({
    name: 'Ivan Fan',
    income: 3,
    debit: 2
});

const incomeDisposer = autorun((reaction) => {
    // if (bankUser.income < 0) {
    //     bankUser.income = 0
    //     throw new Error('throw new error')
    // }
    incomeLabel.innerText = `Ivan Fan income is ${bankUser.income}`
},
    {
        name: 'income',
        // delay: 2*1000,
        onError: (e) => {
            console.log(e)
        }
    }
)
autorun(() => {
    console.log('账户存款:', bankUser.income);
});
// autorun(() => {
//     console.log('账户名称:', bankUser.name);
// });
// var nameDisposer = autorun(() => {
//     console.log("name:" + bankUser.name)
// });
addBtn.addEventListener('click', () => {
    bankUser.income++
})
minusBtn.addEventListener('click', () => {
    bankUser.income--
})
nameInput.addEventListener('change', (e) => {
    bankUser.name= e.target.value;
})