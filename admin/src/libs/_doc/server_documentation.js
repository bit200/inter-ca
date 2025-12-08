// category/category.ctrl.js
router.route('/categories/my').get(m.auth, ctrl.category.get_my);






const ctrl = require('./training');
const router = Router(); // eslint-disable-line new-cap

router.route('/training')
  .get(m.auth, ctrl.training);

router.route('/set_training_history')
  .post(m.auth, (req, res) => {
    res.send('test')
  });

module.exports = router;
