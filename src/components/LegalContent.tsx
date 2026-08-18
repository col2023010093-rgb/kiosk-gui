export function TermsOfUseContent() {
	return (
		<div className="flex flex-col gap-4">
			<p className="text-muted">Last updated: [Date]</p>

			<section>
				<h3 className="mb-1 font-semibold text-accent-deep">1. Acceptance of the Terms</h3>
				<p>
					By creating an account and using the GenErick Health Monitoring Kiosk ("the System"), you agree to
					these Terms of Use. If you do not agree, please do not create an account or use the kiosk.
				</p>
			</section>

			<section>
				<h3 className="mb-1 font-semibold text-accent-deep">2. Purpose of the System</h3>
				<p>
					GenErick is an academic capstone project that provides a self-service kiosk for taking basic
					physiological measurements — such as height, weight, BMI, blood pressure, heart rate, blood
					oxygen (SpO₂), and body temperature — and for viewing general health information based on those
					measurements.
				</p>
			</section>

			<section>
				<h3 className="mb-1 font-semibold text-accent-deep">3. User Account Responsibilities</h3>
				<p>
					You are responsible for providing accurate registration information and for keeping your login
					credentials confidential. You should not share your account with others. Please inform{" "}
					[Project Administrator Contact Information] if you believe your account has been accessed
					without your permission.
				</p>
			</section>

			<section>
				<h3 className="mb-1 font-semibold text-accent-deep">4. Use of the Health Assessment Features</h3>
				<p>
					The kiosk lets you select and take one or more health assessments. Measurements are taken using
					the kiosk's connected sensors and are recorded to your account so you can view your results and
					history.
				</p>
			</section>

			<section>
				<h3 className="mb-1 font-semibold text-accent-deep">5. Health Measurement Limitations</h3>
				<p>
					Measurements taken by the kiosk are estimates produced by consumer-grade sensors and an
					automated process. They may be affected by factors such as sensor placement, movement, ambient
					conditions, and individual physiology. Readings may differ from those taken by clinical
					equipment or a healthcare professional.
				</p>
			</section>

			<section>
				<h3 className="mb-1 font-semibold text-accent-deep">6. General Health Recommendations Disclaimer</h3>
				<p>
					Any health tips, summaries, or recommendations shown by the System are general in nature and
					are generated automatically based on your recorded measurements. They are not personalized
					medical advice and do not account for your full medical history.
				</p>
			</section>

			<section>
				<h3 className="mb-1 font-semibold text-accent-deep">7. Not a Substitute for Professional Medical Care</h3>
				<p>
					The GenErick kiosk is <span className="font-semibold">not a medical device</span> and is not
					intended to diagnose, treat, cure, or prevent any disease or condition. It does not replace
					consultation with a qualified physician or other healthcare professional. Always seek the
					advice of a licensed medical provider regarding any health concern, and seek emergency care
					immediately if you believe you are experiencing a medical emergency.
				</p>
			</section>

			<section>
				<h3 className="mb-1 font-semibold text-accent-deep">8. Appropriate Use of the Kiosk</h3>
				<p>
					Please use the kiosk only for its intended purpose. Do not attempt to tamper with, damage, or
					disassemble the hardware, interfere with other users' sessions, or submit false information
					when registering or taking a measurement.
				</p>
			</section>

			<section>
				<h3 className="mb-1 font-semibold text-accent-deep">9. System Availability and Technical Limitations</h3>
				<p>
					As an academic project, the System may occasionally be unavailable, inaccurate, or interrupted
					due to maintenance, hardware issues, connectivity problems, or ongoing development. No
					guarantee of continuous availability is made.
				</p>
			</section>

			<section>
				<h3 className="mb-1 font-semibold text-accent-deep">10. Changes to These Terms</h3>
				<p>
					These Terms may be updated as the project develops. Continued use of the System after changes
					are posted constitutes acceptance of the revised Terms.
				</p>
			</section>

			<section>
				<h3 className="mb-1 font-semibold text-accent-deep">11. Contact</h3>
				<p>
					Questions about these Terms can be directed to{" "}
					[Project Administrator Contact Information].
				</p>
			</section>
		</div>
	);
}

export function PrivacyPolicyContent() {
	return (
		<div className="flex flex-col gap-4">
			<p className="text-muted">Last updated: [Date]</p>

			<section>
				<h3 className="mb-1 font-semibold text-accent-deep">1. Personal Information We Collect</h3>
				<p>When you register for an account, we collect:</p>
				<ul className="mt-1 list-disc space-y-0.5 pl-5">
					<li>Full Name</li>
					<li>Email address</li>
					<li>Birthdate</li>
					<li>Sex</li>
					<li>Contact number</li>
					<li>Address</li>
					<li>Barcode / LSB ID number</li>
					<li>Account password (stored in encrypted/hashed form, not as plain text)</li>
				</ul>
			</section>

			<section>
				<h3 className="mb-1 font-semibold text-accent-deep">2. Health Assessment Information We Collect</h3>
				<p>When you use the kiosk's assessment features, we may collect:</p>
				<ul className="mt-1 list-disc space-y-0.5 pl-5">
					<li>Height and weight</li>
					<li>Body Mass Index (BMI)</li>
					<li>Blood pressure (systolic and diastolic)</li>
					<li>Heart rate</li>
					<li>Blood oxygen saturation (SpO₂)</li>
					<li>Body temperature</li>
				</ul>
			</section>

			<section>
				<h3 className="mb-1 font-semibold text-accent-deep">3. Why We Collect This Information</h3>
				<p>
					We collect this information to create and manage your account, to operate the kiosk's health
					assessment features, to let you view your own measurement history, and to support the academic
					evaluation of this capstone project.
				</p>
			</section>

			<section>
				<h3 className="mb-1 font-semibold text-accent-deep">4. How We Use Your Information</h3>
				<p>
					Your account information is used to identify you when you sign in and to associate your
					measurements with your profile. Your health assessment data is used to display your results,
					generate general recommendations, and build your measurement history within the System.
				</p>
			</section>

			<section>
				<h3 className="mb-1 font-semibold text-accent-deep">5. How Health Information Is Handled</h3>
				<p>
					Health assessment data is treated as sensitive information. It is only displayed to you (and,
					where applicable, authorized project personnel such as the assigned nurse/dashboard user
					reviewing kiosk activity) and is used solely for the purposes described in this Policy.
				</p>
			</section>

			<section>
				<h3 className="mb-1 font-semibold text-accent-deep">6. Data Storage</h3>
				<p>
					Your information is stored in the System's database used for this capstone project.
					Reasonable, project-appropriate measures are taken to protect stored data, consistent with an
					academic system of this scale.
				</p>
			</section>

			<section>
				<h3 className="mb-1 font-semibold text-accent-deep">7. Data Sharing</h3>
				<p>
					We do not sell your personal or health information. Information is not shared with third
					parties outside of this project, except as required for the System to function (for example,
					authorized personnel involved in operating or evaluating the kiosk) or as required by
					applicable law.
				</p>
			</section>

			<section>
				<h3 className="mb-1 font-semibold text-accent-deep">8. Data Retention</h3>
				<p>
					We retain your account and health assessment data for as long as your account remains active
					or as needed for the purposes of this project. Specific retention periods have not yet been
					finalized; details will be provided as the project is deployed. See{" "}
					[Project Administrator Contact Information] for current retention details.
				</p>
			</section>

			<section>
				<h3 className="mb-1 font-semibold text-accent-deep">9. Your Requests Regarding Your Information</h3>
				<p>
					You may request to view, correct, or request deletion of your personal and health assessment
					information by contacting [Project Administrator Contact Information].
				</p>
			</section>

			<section>
				<h3 className="mb-1 font-semibold text-accent-deep">10. Security</h3>
				<p>
					We take reasonable, project-appropriate steps to help protect your information from
					unauthorized access. However, no system can be guaranteed to be completely secure, and we
					cannot promise absolute security of your data.
				</p>
			</section>

			<section>
				<h3 className="mb-1 font-semibold text-accent-deep">11. Policy Updates</h3>
				<p>
					This Privacy Policy may be updated as the project develops. Continued use of the System after
					changes are posted constitutes acceptance of the revised Policy.
				</p>
			</section>

			<section>
				<h3 className="mb-1 font-semibold text-accent-deep">12. Contact</h3>
				<p>
					Questions about this Privacy Policy or your data can be directed to{" "}
					[Project Administrator Contact Information].
				</p>
			</section>
		</div>
	);
}
