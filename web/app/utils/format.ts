const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export const formatPrice = (value: number) => money.format(value)

export const CSV_TEMPLATE = [
  'name,category,price,tags,in_stock,description',
  'Walnut desk shelf,Desk,89.00,wood|storage,yes,Lifts the monitor and hides the clutter',
  '"Lamp, warm white",Lighting,24.90,led,no,"Quotes ""work"" too"',
].join('\n')
