<?php

use Doctrine\Common\Collections\ArrayCollection;


/**
 * @Entity @Table(name="users")
 */
class User
{
    /** @Id @Column(type="integer") @GeneratedValue */
    protected $id;

    /**
     * One product has many features. This is the inverse side.
     * @OneToMany(targetEntity="MemberRole", mappedBy="member")
     */
    protected $memberRoles;

    /** @Column(type="string") */
    protected $manage;

    /** @Column(type="boolean") */
    protected $admin;

    public function __construct() {
        $this->memberRoles = new ArrayCollection();
    }

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