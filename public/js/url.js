const base62_str = [
	"0",
	"1",
	"2",
	"3",
	"4",
	"5",
	"6",
	"7",
	"8",
	"9",
	"A",
	"B",
	"C",
	"D",
	"E",
	"F",
	"G",
	"H",
	"I",
	"J",
	"K",
	"L",
	"M",
	"N",
	"O",
	"P",
	"Q",
	"R",
	"S",
	"T",
	"U",
	"V",
	"W",
	"X",
	"Y",
	"Z",
	"a",
	"b",
	"c",
	"d",
	"e",
	"f",
	"g",
	"h",
	"i",
	"j",
	"k",
	"l",
	"m",
	"n",
	"o",
	"p",
	"q",
	"r",
	"s",
	"t",
	"u",
	"v",
	"w",
	"x",
	"y",
	"z",
];

//Creates a random number between 1 million (4 char codeword) to 100 billion (7 char codeword), inclusive.
function url_code() {
	let key = Math.floor(Math.random() * 1000000000) + 1000000;
	let hash_str = base62_encode(key);

	return hash_str;
}

//Takes a decimal number and returns a unique code for the shortURL
function base62_encode(key) {
	let hash_str = "";
	while (key > 0) {
		hash_str += base62_str[key % 62];
		key = Math.floor((key /= 62));
	}
	return hash_str;
}

module.exports = {
	url_code,
};