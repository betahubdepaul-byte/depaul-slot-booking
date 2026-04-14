import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

gmail_email = os.environ.get('GMAIL_EMAIL')
gmail_password = os.environ.get('GMAIL_APP_PASSWORD')
admin_email = os.environ.get('ADMIN_EMAIL')

name = os.environ.get('NAME')
email = os.environ.get('EMAIL')
student_id = os.environ.get('STUDENT_ID')
course = os.environ.get('COURSE')
subject = os.environ.get('SUBJECT')
reason = os.environ.get('REASON')
day = os.environ.get('DAY')
day_display = os.environ.get('DAY_DISPLAY')
time_range = os.environ.get('TIME_RANGE')

body_html = f"""
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #1E4D8C; color: white; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
    <h2 style="margin: 0;">DePaul Slot Booking - Confirmed</h2>
  </div>
  <div style="background: white; padding: 24px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 12px 12px;">
    <p>Hi <strong>{name}</strong>,</p>
    <p>Your appointment is confirmed:</p>
    <table style="width: 100%; border-collapse: collapse;">
      <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Date</td><td style="padding: 8px;">{day}, {day_display}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Time</td><td style="padding: 8px;">{time_range}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Student</td><td style="padding: 8px;">{name} ({student_id})</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Course</td><td style="padding: 8px;">{course}</td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Subject</td><td style="padding: 8px;">{subject}</td></tr>
      <tr><td style="padding: 8px;">Reason</td><td style="padding: 8px;">{reason}</td></tr>
    </table>
    <p style="color: #666; font-size: 13px;">This is an automated confirmation. Please arrive on time.</p>
  </div>
</body>
</html>
"""

msg = MIMEMultipart('alternative')
msg['From'] = f"Beta Hub <{gmail_email}>"
msg['To'] = email
msg['Cc'] = admin_email
msg['Subject'] = f"Slot Confirmed - {day}, {day_display} at {time_range}"
msg.attach(MIMEText(body_html, 'html'))

# Support multiple CC recipients separated by commas
cc_list = [addr.strip() for addr in admin_email.split(',')] if admin_email else []
recipients = [email] + cc_list

server = smtplib.SMTP('smtp.gmail.com', 587)
server.starttls()
server.login(gmail_email, gmail_password)
server.sendmail(gmail_email, recipients, msg.as_string())
server.quit()
print(f"Email sent to {email} and CC'd to {admin_email}")

