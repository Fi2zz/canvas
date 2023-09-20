function extract(string) {
	var p = string.match(/[a-df-z]|[\-+]?(?:[\d\.]e[\-+]?|[^\s\-+,a-z])+/gi);
	var last,
		cmd = p[0],
		i = 1;
	const commands = [];
	while (cmd) {
		switch (cmd) {
			case "c":
				commands.push([cmd, p[i++], p[i++], p[i++], p[i++], p[i++], p[i++]]);
				break;
			case "s":
				commands.push([cmd, p[i++], p[i++], null, null, p[i++], p[i++]]);
				break;
			case "q":
				commands.push([cmd, p[i++], p[i++], p[i++], p[i++], null, null]);
				break;
			case "t":
				commands.push([cmd, p[i++], p[i++], null, null, null, null]);
				break;
			case "a":
				commands.push([
					cmd,
					p[i + 5],
					p[i + 6],
					p[i],
					p[i + 1],
					p[i + 3],
					!+p[i + 4],
					p[i + 2],
				]);
				i += 7;
				break;
			case "h":
				commands.push([cmd, p[i++], 0]);
				break;
			case "v":
				commands.push([cmd, 0, p[i++]]);
				break;
			case "m":
			case "l":
			case "M":
			case "L":
				commands.push([cmd, p[i++], p[i++]]);
				break;
			case "C":
				commands.push([cmd, p[i++], p[i++], p[i++], p[i++], p[i++], p[i++]]);
				break;
			case "S":
				commands.push([cmd, p[i++], p[i++], null, null, p[i++], p[i++]]);
				break;
			case "Q":
				commands.push([cmd, p[i++], p[i++], p[i++], p[i++]]);
				break;
			case "T":
				commands.push([cmd, p[i++], p[i++], null, null, null, null]);
				break;
			case "A":
				commands.push([
					cmd,
					p[i + 5],
					p[i + 6],
					p[i],
					p[i + 1],
					p[i + 3],
					!+p[i + 4],
					p[i + 2],
				]);

				i += 7;
				break;
			case "H":
				commands.push([cmd, p[i++], null]);
				break;
			case "V":
				commands.push([cmd, null, p[i++]]);
				break;
			case "Z":
			case "z":
				commands.push([cmd]);
				break;
			default:
				cmd = last;
				i--;
				continue;
		}
		last = cmd;
		if (last == "m") last = "l";
		else if (last == "M") last = "L";
		cmd = p[i++];
	}
	return commands.map(([cmd, ...args]) => {
		args = args.map((x) => {
			if (!isNaN(x) && x != null) return Number(x);
			if (typeof x == "boolean") return Boolean(x);
			return null;
		});
		return [cmd, ...args];
	});
}

export { extract, extract as parse };
