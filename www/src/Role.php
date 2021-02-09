  
<?php
/**
 * @Entity @Table(name="products")
 */
class Role
{
    /** @Id @Column(type="integer") @GeneratedValue */
    protected $id;

    /** @Column(type="string") */
    protected $organization;

    /** @Column(type="string") */
    protected $users;


    public function getId()
    {
        return $this->id;
    }

    public function getName()
    {
        return $this->name;
    }

    public function setName($name)
    {
        $this->name = $name;
    }
}
