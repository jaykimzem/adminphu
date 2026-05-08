# Phumolo Marathon Admin Dashboard

A premium, full-stack admin portal for managing marathon registrations, built with pure HTML/JS and Supabase.

## Features
- **Dashboard Overview**: Real-time stats and registration trends.
- **Registrations**: Searchable, filterable table of all runners.
- **BIB Badge**: Professional BIB badge generation and printing.
- **Data Export**: Export filtered data to CSV for offline use.
- **Multi-Table View**: Support for viewing Volunteers, Karura Run, and Sponsorships.
- **Secure Auth**: Admin-only access via Supabase Auth.

## Setup Instructions
1. **Local Deployment**: This project is designed to run on XAMPP or any static web server.
2. **Configuration**: The Supabase keys are already configured in `config.js`.
3. **Database Setup**: Run the SQL script provided in `database.sql` inside your Supabase SQL Editor.
4. **Login**: Use your Supabase Auth credentials to log in.

## Database Schema (SQL)
Run this in Supabase SQL Editor:

```sql
-- Create registrations table
CREATE TABLE IF NOT EXISTS registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bib_number SERIAL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    gender TEXT,
    age INT,
    id_number TEXT,
    race_category TEXT,
    shirt_size TEXT,
    shirt_color TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    payment_status TEXT DEFAULT 'Pending',
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Note: bib_number is handled by SERIAL (auto-incrementing integer)
```

## Frontend Integration Snippet
Add this code to your registration form handler on the main website:

```javascript
const submitRegistration = async (formData) => {
    const SUPABASE_URL = 'https://lqttzudtwarkwyxcnssd.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_UYNtiM0r3GfdtYpIdR-AeQ_oH2ivH7p';

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/registrations`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
                first_name: formData.firstName,
                last_name: formData.lastName,
                email: formData.email,
                phone: formData.phone,
                gender: formData.gender,
                age: parseInt(formData.age),
                id_number: formData.idNumber,
                race_category: formData.raceCategory,
                shirt_size: formData.shirtSize,
                shirt_color: formData.shirtColor,
                emergency_contact_name: formData.emergencyName,
                emergency_contact_phone: formData.emergencyPhone,
                payment_status: 'Pending'
            })
        });

        if (response.ok) {
            alert('Registration successful!');
        } else {
            const err = await response.json();
            console.error('Registration failed:', err);
        }
    } catch (error) {
        console.error('Error submitting form:', error);
    }
};
```
