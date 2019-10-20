export function getCurrentDatetime() {
  const today = new Date();
  const date = `${today.getFullYear()}-${today.getMonth()+1}-${today.getDate()}`;
  const time = `${today.getHours()}:${today.getMinutes()+1}:${today.getSeconds()}`;
  return `${date} ${time}`;
}