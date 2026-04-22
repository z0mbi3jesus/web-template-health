const { query: dbQuery } = require('./backend/config/database');

async function showExistingSlots() {
    console.log('Current Time Slots in Database:\n');

    try {
        const result = await dbQuery(`
            SELECT 
                av_slots.id,
                av_slots.day_of_week,
                av_slots.start_time,
                av_slots.end_time,
                av_slots.is_recurring,
                u.first_name || ' ' || u.last_name as staff_name,
                at.name as appointment_type
            FROM available_slots av_slots
            LEFT JOIN users u ON av_slots.staff_id = u.id
            LEFT JOIN appointment_types at ON av_slots.appointment_type_id = at.id
            WHERE av_slots.is_active = true
            ORDER BY u.first_name, av_slots.day_of_week, av_slots.start_time
        `);

        if (result.rows.length === 0) {
            console.log('No time slots found.');
            return;
        }

        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        let currentStaff = '';

        result.rows.forEach(slot => {
            if (slot.staff_name !== currentStaff) {
                currentStaff = slot.staff_name;
                console.log(`\n${currentStaff}:`);
            }

            const dayName = days[slot.day_of_week];
            const recurring = slot.is_recurring ? '(Recurring)' : '(One-time)';
            
            console.log(`  • ${dayName} ${slot.start_time}-${slot.end_time} - ${slot.appointment_type} ${recurring}`);
        });

        console.log(`\nTotal slots: ${result.rows.length}`);
        console.log('\nTo avoid conflicts:');
        console.log('   • Choose times that don\'t overlap with existing slots');
        console.log('   • Use different time ranges or different days');
        console.log('   • Delete conflicting slots first if you want to replace them');

    } catch (error) {
        console.error('❌ Error fetching time slots:', error.message);
    }

    process.exit(0);
}

showExistingSlots();