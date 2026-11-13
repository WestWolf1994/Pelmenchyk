/*
 * Каталог: категорії та страви.
 * Щоб змінити ціну, назву чи додати страву, редагуйте цей файл.
 *
 * image — шлях до фото (assets/img/...). Якщо фото немає, показується малюнок (art).
 * art   — тип малюнка: pelmeni, vareniki, mlynci, borsch, deruny, syrniki, uzvar.
 * sauce — колір соусу на малюнку.
 * available — false: страва показується, але «Немає в наявності».
 *
 * Ціни, описи й ваги нижче — приклад. Замініть на свої.
 */
window.PELMENCHYK_DATA = {
  categories: [
    { id: "pelmeni",  name: "Пельмені",       bg: "#D3A275", image: "assets/img/pelmeni.webp",  art: "pelmeni",  sauce: "#FFFDF8" },
    { id: "vareniki", name: "Вареники",       bg: "#E4CBA8", image: "assets/img/vareniki.webp", art: "vareniki", sauce: "#A63A5B" },
    { id: "mlynci",   name: "Млинці",         bg: "#EBD7BB", image: "assets/img/mlynci.webp",   art: "mlynci",   sauce: "#FFFDF8" },
    { id: "main",     name: "Основні страви", bg: "#DFBE98", image: "assets/img/mimoza.webp",   art: "borsch",   sauce: "#FFFDF8" },
    { id: "desserts", name: "Десерти",        bg: "#E9CDB0", image: "assets/img/medovyk.webp",  art: "syrniki",  sauce: "#A63A5B" },
    { id: "drinks",   name: "Напої",          bg: "#E3D2B6", image: "",                         art: "uzvar",    sauce: "#FFFDF8" }
  ],

  products: [
    { id: 1,  category: "pelmeni",  name: "Пельмені з телятиною",            description: "Класичні, зі соковитою начинкою та тонким тістом.", price: 220, weight: "10 шт · 300 г", image: "assets/img/pelmeni.webp",  art: "pelmeni",  sauce: "#FFFDF8", available: true },
    { id: 2,  category: "pelmeni",  name: "Пельмені зі свининою та цибулею", description: "Ситні, з ароматною цибулею всередині.",              price: 195, weight: "10 шт · 300 г", image: "assets/img/pelmeni.webp",  art: "pelmeni",  sauce: "#E2B25E", available: true },
    { id: 3,  category: "pelmeni",  name: "Пельмені з куркою",               description: "Ніжна начинка для легкого обіду.",                   price: 180, weight: "10 шт · 280 г", image: "assets/img/pelmeni.webp",  art: "pelmeni",  sauce: "#E9967A", available: true },
    { id: 4,  category: "vareniki", name: "Вареники з картоплею",            description: "Домашня картопля з підсмаженою цибулею.",            price: 140, weight: "8 шт · 320 г",  image: "assets/img/vareniki.webp", art: "vareniki", sauce: "#E2B25E", available: true },
    { id: 5,  category: "vareniki", name: "Вареники з вишнею",               description: "Солодка вишня у ніжному тісті.",                      price: 155, weight: "8 шт · 300 г",  image: "",                         art: "vareniki", sauce: "#A63A5B", available: true },
    { id: 6,  category: "vareniki", name: "Вареники з сиром",                description: "Сирна начинка з ваніллю.",                            price: 145, weight: "8 шт · 300 г",  image: "",                         art: "vareniki", sauce: "#FFFDF8", available: true },
    { id: 7,  category: "mlynci",   name: "Млинці з м'ясом",                 description: "Тонкі млинці з м'ясною начинкою.",                    price: 170, weight: "2 шт · 260 г",  image: "assets/img/mlynci.webp",   art: "mlynci",   sauce: "#FFFDF8", available: true },
    { id: 8,  category: "mlynci",   name: "Млинці з сиром і зеленню",        description: "Свіжі трави й м'який сир.",                           price: 150, weight: "2 шт · 240 г",  image: "",                         art: "mlynci",   sauce: "#6F8B3C", available: true },
    { id: 9,  category: "main",     name: "Борщ із пампушками",              description: "Наваристий борщ зі сметаною.",                        price: 160, weight: "1 порція · 400 г", image: "",                      art: "borsch",   sauce: "#FFFDF8", available: true },
    { id: 10, category: "main",     name: "Деруни зі сметаною",              description: "Хрусткі картопляні деруни.",                          price: 165, weight: "4 шт · 250 г",  image: "",                         art: "deruny",   sauce: "#FFFDF8", available: true },
    { id: 13, category: "main",     name: "Салат «Мімоза»",                  description: "Шаруватий салат з картоплею, морквою та яйцем.",      price: 140, weight: "1 порція · 220 г", image: "assets/img/mimoza.webp", art: "borsch",   sauce: "#FFFDF8", available: true },
    { id: 11, category: "desserts", name: "Сирники",                         description: "Ніжні сирники з ягідним соусом.",                     price: 130, weight: "3 шт · 210 г",  image: "",                         art: "syrniki",  sauce: "#A63A5B", available: true },
    { id: 14, category: "desserts", name: "Медовик",                         description: "Тонкі медові коржі з ніжним кремом.",                 price: 120, weight: "1 шматок · 150 г", image: "assets/img/medovyk.webp", art: "syrniki",  sauce: "#FFFDF8", available: true },
    { id: 12, category: "drinks",   name: "Узвар",                           description: "Компот із сушених фруктів.",                          price: 60,  weight: "300 мл",        image: "",                         art: "uzvar",    sauce: "#FFFDF8", available: true }
  ],

  // Страви, які крутяться в головному блоці (потрібні фото).
  showcase: [
    { product: 4,  line1: "Вареники", line2: "з картоплею", short: "Вареники", badge: "#F2C9A5" },
    { product: 1,  line1: "Пельмені", line2: "з телятиною", short: "Пельмені", badge: "#E9B8A8" },
    { product: 7,  line1: "Млинці",   line2: "з м'ясом",    short: "Млинці",   badge: "#F3DFA8" },
    { product: 13, line1: "Салат",    line2: "«Мімоза»",    short: "Мімоза",   badge: "#CBDCAA" },
    { product: 14, line1: "Торт",     line2: "Медовик",     short: "Медовик",  badge: "#E4CBA8" }
  ]
};
