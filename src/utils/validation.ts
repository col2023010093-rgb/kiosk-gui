export function isValidEmail(value: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isValidPhilippinePhone(value: string): boolean {
	const digits = value.replace(/\D/g, "");
	return digits.length === 11 && digits.startsWith("09");
}

export function isValidBarcode(value: string): boolean {
	return /^[A-Za-z0-9-]{4,}$/.test(value.trim());
}

export function isValidPin(value: string): boolean {
	return /^\d{4}$/.test(value);
}

export function passwordsMatch(password: string, confirmPassword: string): boolean {
	return password.length > 0 && password === confirmPassword;
}

export function isAdult(birthdate: string): boolean {
	const dob = new Date(birthdate);
	if (Number.isNaN(dob.getTime())) return false;
	const age = Math.floor((Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
	return age >= 0 && age < 130;
}
