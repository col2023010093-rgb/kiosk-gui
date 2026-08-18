import { PROGRAM_CODES } from "../data/programs";
import type { PatientType, Sex } from "../types/database";

const NAME_PATTERN = /^[\p{L}\p{M}]+(?:[ '-][\p{L}\p{M}]+)*$/u;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
const IDENTIFICATION_PATTERN = /^\d{4,64}$/;
const PATIENT_TYPES = new Set<PatientType>(["student", "faculty", "staff"]);
const SEXES = new Set<Sex>(["female", "male"]);

export interface RegistrationAddress {
	country: string;
	region: string;
	province?: string;
	cityMunicipality: string;
	barangay: string;
	street: string;
	houseNumber: string;
}

export interface RegistrationInput {
	firstName: string;
	lastName: string;
	email: string;
	password: string;
	birthdate: string;
	sex: Sex;
	patientType: PatientType;
	course?: string;
	department?: string;
	contactNumber: string;
	identificationNumber: string;
	address: RegistrationAddress;
	agreedToTerms: boolean;
	consentedToHealthData: boolean;
}

export interface NormalizedRegistrationInput extends Omit<RegistrationInput, "email" | "contactNumber" | "address" | "course" | "department" | "identificationNumber"> {
	email: string;
	contactNumber: string;
	identificationNumber: string;
	course?: string;
	department?: string;
	address: RegistrationAddress;
}

export function normalizeWhitespace(value: string): string {
	return value.trim().replace(/\s+/gu, " ");
}

function isValidText(value: string, maxLength: number, minLength = 1): boolean {
	return value.length >= minLength && value.length <= maxLength && !/[<>]/.test(value) && [...value].every((character) => {
		const code = character.codePointAt(0) ?? 0;
		return code >= 32 && code !== 127;
	});
}

function normalizePhilippinePhone(value: string): string | null {
	if (!/^\d+$/.test(value)) return null;
	if (/^09\d{9}$/.test(value)) return value;
	if (/^639\d{9}$/.test(value)) return `0${value.slice(2)}`;
	return null;
}

function isValidBirthdate(value: string): boolean {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
	const date = new Date(`${value}T00:00:00.000Z`);
	if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return false;
	return value <= new Date().toISOString().slice(0, 10);
}

export function validateAndNormalizeRegistration(input: RegistrationInput): { value?: NormalizedRegistrationInput; error?: string } {
	if (!input || typeof input !== "object") return { error: "Invalid registration request." };
	if (
		typeof input.firstName !== "string" || typeof input.lastName !== "string" ||
		typeof input.email !== "string" || typeof input.password !== "string" ||
		typeof input.birthdate !== "string" || typeof input.contactNumber !== "string" ||
		typeof input.identificationNumber !== "string" || typeof input.sex !== "string" ||
		typeof input.patientType !== "string" || typeof input.agreedToTerms !== "boolean" ||
		typeof input.consentedToHealthData !== "boolean" ||
		(input.course !== undefined && typeof input.course !== "string") ||
		(input.department !== undefined && typeof input.department !== "string")
	) return { error: "Invalid registration request." };
	if (!input.address || typeof input.address !== "object") return { error: "Please complete your address." };
	const address = input.address;
	if (
		typeof address.country !== "string" || typeof address.region !== "string" ||
		typeof address.cityMunicipality !== "string" || typeof address.barangay !== "string" ||
		typeof address.street !== "string" || typeof address.houseNumber !== "string" ||
		(address.province !== undefined && typeof address.province !== "string")
	) return { error: "Invalid registration request." };
	const firstName = normalizeWhitespace(input.firstName ?? "");
	const lastName = normalizeWhitespace(input.lastName ?? "");
	const email = (input.email ?? "").trim().toLowerCase();
	const department = normalizeWhitespace(input.department ?? "");
	const identificationNumber = normalizeWhitespace(input.identificationNumber ?? "");

	if (!NAME_PATTERN.test(firstName) || firstName.length < 2 || firstName.length > 80) return { error: "Enter a valid first name." };
	if (!NAME_PATTERN.test(lastName) || lastName.length < 2 || lastName.length > 80) return { error: "Enter a valid last name." };
	if (email.length > 254 || !EMAIL_PATTERN.test(email)) return { error: "Enter a valid email address." };
	if (typeof input.password !== "string" || input.password.length < 8) return { error: "Password must be at least 8 characters." };
	if (!isValidBirthdate(input.birthdate ?? "")) return { error: "Enter a valid birthdate that is not in the future." };
	if (!SEXES.has(input.sex)) return { error: "Please select a valid sex." };
	if (!PATIENT_TYPES.has(input.patientType)) return { error: "Please select a valid patient type." };
	if (!IDENTIFICATION_PATTERN.test(identificationNumber)) return { error: "Enter a valid numeric ID number (4–64 digits)." };

	const contactNumber = normalizePhilippinePhone(input.contactNumber ?? "");
	if (!contactNumber) return { error: "Enter a valid Philippine mobile number using digits only." };
	if (input.patientType === "student" && !PROGRAM_CODES.has(input.course ?? "")) return { error: "Select a valid course." };
	if (input.patientType !== "student" && !isValidText(department, 100, 2)) return { error: "Enter a valid department." };
	const normalizedAddress: RegistrationAddress = {
		country: normalizeWhitespace(address.country ?? ""),
		region: normalizeWhitespace(address.region ?? ""),
		province: normalizeWhitespace(address.province ?? "") || undefined,
		cityMunicipality: normalizeWhitespace(address.cityMunicipality ?? ""),
		barangay: normalizeWhitespace(address.barangay ?? ""),
		street: normalizeWhitespace(address.street ?? ""),
		houseNumber: normalizeWhitespace(address.houseNumber ?? ""),
	};
	if (normalizedAddress.country !== "Philippines") return { error: "Country must be Philippines." };
	if (!isValidText(normalizedAddress.region, 120) || !isValidText(normalizedAddress.cityMunicipality, 120) || !isValidText(normalizedAddress.barangay, 120)) return { error: "Please select a valid address." };
	if (!isValidText(normalizedAddress.street, 160, 2)) return { error: "Enter a valid street address." };
	if (!isValidText(normalizedAddress.houseNumber, 80, 1)) return { error: "Enter a valid house or building number." };
	if (!input.agreedToTerms || !input.consentedToHealthData) return { error: "Both consent checkboxes are required." };

	return {
		value: {
			...input,
			firstName,
			lastName,
			email,
			contactNumber,
			identificationNumber,
			course: input.patientType === "student" ? input.course : undefined,
			department: input.patientType === "student" ? undefined : department,
			address: normalizedAddress,
		},
	};
}
